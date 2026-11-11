import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("./backlog-health.mjs", import.meta.url));
function fixture(t, content) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "backlog health "));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const file = path.join(root, "BACKLOG.md");
  fs.writeFileSync(file, content);
  return file;
}
const run = file => spawnSync(process.execPath, [script, file, "--json"], { encoding: "utf8" });

test("ambiguous task states are reported without rewriting tasks or claiming actual concurrency", t => {
  const content = "| ID | 状态 |\n|---|---|\n| T-1 | 🔨 待办 |\n| T-2 | 📋 待办 |\n| T-3 | 🔨 |\n| T-4 | ✅ |\n";
  const file = fixture(t, content);
  const result = run(file);
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.summary.inconsistent_status_rows, 1);
  assert.deepEqual(report.summary.task_states, { todo: 1, in_progress: 2, done: 1, paused: 0, blocked: 0 });
  assert.match(report.findings.map(f => f.m).join("\n"), /T-1.*冲突/);
  assert.equal(fs.readFileSync(file, "utf8"), content);
});

test("size thresholds distinguish hard limit from runaway and preserve existing exit semantics", t => {
  const file = fixture(t, "x\n".repeat(16 * 1024));
  let result = run(file);
  assert.equal(result.status, 1, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).thresholds_bytes, { warning: 15360, error: 30720, runaway: 61440 });
  fs.writeFileSync(file, "x\n".repeat(31 * 1024));
  result = run(file);
  assert.equal(result.status, 2, result.stderr);
  assert.equal(JSON.parse(result.stdout).exit_code, 2);
});

test("missing backlog is an explicit skipped result", t => {
  const file = fixture(t, "");
  fs.unlinkSync(file);
  const result = run(file);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).skipped, "missing-backlog");
});
