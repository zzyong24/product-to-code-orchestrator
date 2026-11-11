import { test } from "node:test";
import assert from "node:assert/strict";
import { createTaskQueue } from "./portable-slice.mjs";

// An in-memory "disk" so we never touch the filesystem. save/load just
// snapshot/restore a JSON string, exactly like the file-backed original.
function memStore(initial = null) {
  let blob = initial == null ? null : JSON.stringify(initial);
  return {
    load: () => (blob == null ? {} : JSON.parse(blob)),
    save: (jobs) => {
      blob = JSON.stringify(jobs);
    },
    raw: () => (blob == null ? null : JSON.parse(blob)),
  };
}

const seq = (...ids) => {
  let i = 0;
  return () => ids[i++] ?? `auto${i}`;
};

test("submit registers a running job and fire-and-forget completes it", async () => {
  const store = memStore();
  const q = createTaskQueue({ ...store, genId: seq("j1") });

  let ran = false;
  const { jobId, registered } = q.submit({ topic: "x" }, async () => {
    ran = true;
  });
  await registered;

  assert.equal(jobId, "j1");
  // registered synchronously => visible as running before drain
  assert.equal(q.get("j1").status, "running");
  assert.equal(q.get("j1").topic, "x");

  await q.drain();
  assert.equal(ran, true);
  assert.equal(q.get("j1").status, "done");
  // persisted to "disk"
  assert.equal(store.raw().j1.status, "done");
});

test("runner can report progress via update, then auto-finalizes", async () => {
  const store = memStore();
  const q = createTaskQueue({ ...store, genId: seq("p1") });
  const seen = [];

  q.submit({}, async (_id, { update }) => {
    await update({ progress: "step-1" });
    seen.push(q.get("p1").progress);
    await update({ progress: "step-2" });
    seen.push(q.get("p1").progress);
  });
  await q.drain();

  assert.deepEqual(seen, ["step-1", "step-2"]);
  assert.equal(q.get("p1").status, "done");
});

test("a throwing runner marks the job error with the message", async () => {
  const store = memStore();
  const q = createTaskQueue({ ...store, genId: seq("e1") });

  q.submit({}, async () => {
    throw new Error("boom");
  });
  await q.drain();

  const job = q.get("e1");
  assert.equal(job.status, "error");
  assert.equal(job.error, "boom");
  assert.equal(store.raw().e1.status, "error");
});

test("restart-compensation: a persisted running job is swept to error on load", () => {
  // Simulate a crash: "disk" still says running, but no process is driving it.
  const store = memStore({
    crashed: { id: "crashed", status: "running", progress: "mid", createdAt: 1 },
    okjob: { id: "okjob", status: "done", createdAt: 2 },
  });

  const q = createTaskQueue(store);

  assert.equal(q.get("crashed").status, "error");
  assert.match(q.get("crashed").error, /restarted/);
  // terminal jobs are left untouched
  assert.equal(q.get("okjob").status, "done");
  // the sweep is persisted immediately
  assert.equal(store.raw().crashed.status, "error");
});

test("list returns newest-first; clearDone prunes terminal jobs", async () => {
  const store = memStore();
  let t = 100;
  const q = createTaskQueue({
    ...store,
    now: () => t++,
    genId: seq("a", "b", "c"),
  });

  q.submit({}, async () => {}); // a @100
  q.submit({}, async () => {
    throw new Error("x");
  }); // b @101 -> error
  q.submit({}, async () => {}); // c @102
  await q.drain();

  const ordered = q.list().map((j) => j.id);
  assert.deepEqual(ordered, ["c", "b", "a"]);

  const removed = await q.clearDone();
  assert.equal(removed, 3); // a:done, b:error, c:done all terminal
  assert.deepEqual(q.list(), []);
  assert.deepEqual(store.raw(), {});
});

test("update on unknown job is a no-op; remove reports existence", async () => {
  const store = memStore();
  const q = createTaskQueue({ ...store, genId: seq("r1") });

  assert.equal(await q.update("nope", { status: "done" }), undefined);

  q.submit({}, async () => {});
  await q.drain();
  assert.equal(await q.remove("r1"), true);
  assert.equal(await q.remove("r1"), false);
});

test("persist failures never escape (best-effort disk)", async () => {
  let calls = 0;
  const q = createTaskQueue({
    load: () => ({}),
    save: () => {
      calls += 1;
      throw new Error("disk full");
    },
    genId: seq("d1"),
  });

  // submit + runner completion both try to persist and must not reject
  const { registered } = q.submit({}, async () => {});
  await registered;
  await q.drain();

  assert.ok(calls > 0);
  assert.equal(q.get("d1").status, "done");
});
