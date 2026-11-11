// file-persisted-task-queue — production blueprint (zero third-party deps).
//
// L2 reference (rewritten idea, NOT copied):
//   deepwiki-open  api/batch_wiki.py  (commit 6be3c16)
//     - _load_persisted()  L55-66   -> restart-compensation sweep
//     - _save_persisted()  L69-74   -> best-effort JSON dump
//     - create_job()       L433-465 -> uuid + status:running + create_task
//     - _run_job()         L308-427 -> the long pipeline (NOT part of this slice)
//     - list/get/delete/clear_done  L469-506
//
// What this blueprint keeps (the reusable engineering core):
//   1. single-file JSON persistence of an in-memory job map;
//   2. a serialized critical section around every read-modify-write;
//   3. fire-and-forget submit() that returns an id immediately;
//   4. the load-time "running -> error" crash-recovery invariant.
//
// What it deliberately drops (app-specific, supply your own):
//   - the web framework / route handlers (FastAPI router here);
//   - the actual job runner (LLM wiki-generation pipeline here);
//   - any auth / rate-limit / progress-streaming concerns.
//
// Wiring (Node, fs-backed) — see also example/portable-slice.mjs for the
// framework-free core used by the test:
//
//   import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
//   import { dirname } from "node:path";
//   import { createTaskQueue } from "./portable-slice.mjs";
//
//   const FILE = "./output/task_jobs.json";
//   mkdirSync(dirname(FILE), { recursive: true });
//   const queue = createTaskQueue({
//     load: () => { try { return JSON.parse(readFileSync(FILE, "utf8")); } catch { return {}; } },
//     save: (jobs) => writeFileSync(FILE, JSON.stringify(jobs, null, 2)),
//   });
//
//   // POST /jobs  -> 202 with { jobId }
//   const { jobId } = queue.submit(payload, async (id, { update }) => {
//     await update({ progress: "fetching" });
//     // ... do the long work, calling update() for progress ...
//   });
//
//   // GET /jobs        -> queue.list()      (newest first)
//   // GET /jobs/:id    -> queue.get(id)
//   // DELETE /jobs/:id -> queue.remove(id)
//   // POST /jobs/clear -> queue.clearDone()
//
// When NOT to use (use Celery / BullMQ / Dramatiq / SQS instead):
//   - concurrency > ~50, or you need real backpressure / worker pools;
//   - you need retries, priorities, scheduled/delayed jobs, or fan-out;
//   - you run multiple processes/replicas (a single JSON file is not a
//     cross-process lock — last-writer-wins will corrupt the map).
//
// The canonical, runnable implementation is example/portable-slice.mjs.
// Copy that file and wire load/save to your storage of choice.

export { createTaskQueue } from "../example/portable-slice.mjs";
