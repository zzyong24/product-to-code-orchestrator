import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { planLessonExecution, runLessonCommand, runLessonChecks } from './lesson-runner.mjs';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lesson-execution-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}
const policy = { minimum_timeout_ms: 50, default_timeout_ms: 2000, cleanup_grace_ms: 30, settlement_margin_ms: 100 };
const shellQuote = value => `'${String(value).replaceAll("'", "'\\''")}'`;

test('lesson budgets are derived from every serial command and cleanup; absent or short budgets fail closed', () => {
  assert.equal(planLessonExecution([]).ok, true);
  assert.equal(planLessonExecution([{ check: 'manual' }]).ok, true);
  assert.equal(planLessonExecution([{ check: 'true' }]).ok, false);
  const lessons = [{ led: 'A', check: 'true' }, { led: 'B', check: 'true', timeout_ms: 3000 }];
  const plan = planLessonExecution(lessons, policy);
  assert.equal(plan.ok, true);
  assert.equal(plan.overallTimeoutMs, 2000 + 3000 + 2 * (30 + 100) + 1);
  assert.equal(planLessonExecution(lessons, { ...policy, overall_timeout_ms: 5000 }).ok, false);
  assert.equal(planLessonExecution([{ check: 'true', timeout_ms: 20 }], policy).ok, false);
  assert.equal(planLessonExecution([{ check: 'true', timeout_ms: 0 }], policy).ok, false);
});

test('commands execute serially and expose time, exit status, and bounded failure output', async t => {
  const root = fixture(t), events = [];
  const run = await runLessonChecks([
    { led: 'A', check: "printf 'ready' > order" },
    { led: 'B', check: "test \"$(cat order)\" = ready && printf 'failure detail' >&2 && exit 7" },
  ], { cwd: root, policy, onEvent: event => events.push(event) });
  assert.equal(run.ok, true);
  assert.deepEqual(run.results.map(result => result.outcome), ['hold', 'fire']);
  assert.equal(run.results[1].status, 7);
  assert.match(run.results[1].stderr, /failure detail/);
  assert.ok(run.results.every(result => result.durationMs >= 0));
  assert.deepEqual(events.map(event => `${event.type}:${event.led}`), ['start:A', 'finish:A', 'start:B', 'finish:B']);
});

test('timeout kills the process group including SIGTERM-ignoring descendants', { skip: process.platform === 'win32' }, async t => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, 'child.cjs'), `
    const fs = require('node:fs');
    fs.writeFileSync('descendant.pid', String(process.pid));
    process.on('SIGTERM', () => {});
    setInterval(() => fs.appendFileSync('heartbeat', 'x'), 20);
  `);
  fs.writeFileSync(path.join(root, 'parent.cjs'), `
    const {spawn} = require('node:child_process');
    spawn(process.execPath, ['child.cjs'], {stdio:'inherit'});
    process.on('SIGTERM', () => {});
    setInterval(() => {}, 20);
  `);
  const run = await runLessonCommand(`${shellQuote(process.execPath)} parent.cjs`, {
    cwd: root, timeoutMs: 400, cleanupGraceMs: 40, settlementMarginMs: 100,
  });
  assert.equal(run.outcome, 'timeout');
  assert.ok(run.durationMs < 2000, `timeout was not bounded: ${run.durationMs} ms`);
  const pid = Number(fs.readFileSync(path.join(root, 'descendant.pid'), 'utf8'));
  const size = fs.statSync(path.join(root, 'heartbeat')).size;
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(fs.statSync(path.join(root, 'heartbeat')).size, size, 'descendant kept running after timeout');
  let state = '';
  try { state = execFileSync('ps', ['-o', 'stat=', '-p', String(pid)], { encoding: 'utf8' }).trim(); } catch {}
  assert.ok(!state || state.startsWith('Z'), `descendant remains executable: ${state}`);
});

test('cancellation and background descendants cannot become a successful guard result', { skip: process.platform === 'win32' }, async t => {
  const root = fixture(t), controller = new AbortController();
  const pending = runLessonCommand('sleep 20', {
    cwd: root, timeoutMs: 5000, cleanupGraceMs: 20, settlementMarginMs: 100, signal: controller.signal,
  });
  setTimeout(() => controller.abort(), 40);
  assert.equal((await pending).outcome, 'cancelled');
  const leaked = await runLessonCommand('sleep 20 & exit 0', {
    cwd: root, timeoutMs: 5000, cleanupGraceMs: 20, settlementMarginMs: 100,
  });
  assert.equal(leaked.outcome, 'unfinished-child');
  assert.ok(leaked.durationMs < 1500);
});
