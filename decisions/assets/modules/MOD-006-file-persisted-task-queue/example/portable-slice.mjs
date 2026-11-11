// file-persisted-task-queue — zero-dependency rewrite.
//
// Origin idea (rewritten, not copied): deepwiki-open api/batch_wiki.py
// fire-and-forget background queue backed by a single JSON file, with a
// "running -> error" restart-compensation pass on load. The original used
// FastAPI + asyncio.Lock + uuid + an LLM pipeline runner; this slice keeps
// ONLY the portable engineering core: an in-memory job map mirrored to a
// JSON file, a serialized critical section, fire-and-forget execution, and
// the crash-recovery sweep. No web framework, no third-party package.
//
// Public API:
//   createTaskQueue({ load, save, now, genId }) -> queue
//   queue.submit(payload, runner) -> jobId        (returns immediately)
//   queue.update(jobId, patch)                    (serialized merge + persist)
//   queue.get(jobId) / queue.list() / queue.remove(jobId) / queue.clearDone()
//   queue.drain()                                 (test helper: await all runners)

import { randomUUID } from "node:crypto";

const TERMINAL = new Set(["done", "error"]);

// A tiny async mutex so concurrent submit/update calls cannot interleave a
// read-modify-write against the shared job map (mirrors asyncio.Lock usage).
function createMutex() {
  let tail = Promise.resolve();
  return function runExclusive(fn) {
    const result = tail.then(fn);
    // swallow rejection on the chain so one failure does not poison the lock
    tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };
}

export function createTaskQueue(options = {}) {
  const {
    // load(): returns persisted job map (object) or null/undefined.
    load = () => ({}),
    // save(jobs): persist the job map. Failures are swallowed (best-effort),
    // matching the original's "don't crash the request on a disk hiccup".
    save = () => {},
    now = () => Date.now(),
    genId = () => randomUUID().replace(/-/g, ""),
  } = options;

  const lock = createMutex();
  const inflight = new Set();

  // --- restart-compensation sweep (the load-time invariant) ---
  // Any job left in a non-terminal "running" state means the process died
  // mid-run; on restart there is no longer a task driving it, so mark it
  // failed rather than leaving it stuck forever.
  function recover(raw) {
    const jobs = raw && typeof raw === "object" ? raw : {};
    for (const job of Object.values(jobs)) {
      if (job && job.status === "running") {
        job.status = "error";
        job.error = "service restarted; task interrupted, please resubmit";
      }
    }
    return jobs;
  }

  const jobs = recover(load());
  // Persist the recovered state so the swept jobs survive even if no further
  // mutation happens before the next crash.
  try {
    save(jobs);
  } catch {
    /* best-effort */
  }

  function persist() {
    try {
      save(jobs);
    } catch {
      /* best-effort: never let a persist failure escape */
    }
  }

  function update(jobId, patch) {
    return lock(() => {
      const job = jobs[jobId];
      if (!job) return undefined;
      Object.assign(job, patch);
      persist();
      return { ...job };
    });
  }

  function submit(payload, runner) {
    const jobId = genId();
    // Synchronously register the job under the lock, then fire-and-forget the
    // runner. submit resolves to the id without awaiting the work.
    const registered = lock(() => {
      jobs[jobId] = {
        id: jobId,
        status: "running",
        progress: "queued",
        createdAt: now(),
        ...payload,
      };
      persist();
    });

    const task = registered.then(async () => {
      try {
        await runner(jobId, {
          update: (patch) => update(jobId, patch),
        });
        // Only auto-finalize if the runner left it running.
        const cur = jobs[jobId];
        if (cur && !TERMINAL.has(cur.status)) {
          await update(jobId, { status: "done", progress: "completed" });
        }
      } catch (err) {
        await update(jobId, {
          status: "error",
          error: err && err.message ? err.message : String(err),
        });
      } finally {
        inflight.delete(task);
      }
    });
    inflight.add(task);
    return { jobId, registered };
  }

  function get(jobId) {
    const job = jobs[jobId];
    return job ? { ...job } : undefined;
  }

  function list() {
    // newest first, by createdAt (matches the original's reverse-by-created).
    return Object.values(jobs)
      .map((j) => ({ ...j }))
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }

  function remove(jobId) {
    return lock(() => {
      const existed = jobId in jobs;
      delete jobs[jobId];
      if (existed) persist();
      return existed;
    });
  }

  function clearDone() {
    return lock(() => {
      let removed = 0;
      for (const [id, job] of Object.entries(jobs)) {
        if (TERMINAL.has(job.status)) {
          delete jobs[id];
          removed += 1;
        }
      }
      if (removed) persist();
      return removed;
    });
  }

  // test/shutdown helper: await every fire-and-forget runner.
  async function drain() {
    while (inflight.size) {
      await Promise.all([...inflight]);
    }
  }

  return { submit, update, get, list, remove, clearDone, drain };
}
