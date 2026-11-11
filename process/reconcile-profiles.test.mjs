import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL = path.resolve(HERE, '..');
const quick = ['--profile', 'quick', '--read-only'];
const budget = { minimum_timeout_ms: 20, default_timeout_ms: 1500, cleanup_grace_ms: 20, settlement_margin_ms: 100 };

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reconcile-profiles-'));
  const control = path.join(root, 'orchestrator'), processDir = path.join(control, 'process');
  fs.cpSync(HERE, processDir, { recursive: true, filter: source => !source.endsWith('.test.mjs') });
  fs.copyFileSync(path.join(SKILL, 'templates', 'ARTIFACT_MANIFEST_TEMPLATE.yaml'), path.join(control, 'ARTIFACT_MANIFEST.yaml'));
  fs.writeFileSync(path.join(control, 'DECISION_LOG.md'), '# Decisions\n');
  fs.writeFileSync(path.join(root, 'BACKLOG.md'), '| ID | 任务 | 状态 | 文档 | 审核 | 验收 |\n|---|---|---|---|---|---|\n');
  fs.writeFileSync(path.join(processDir, 'reconcile.config.json'), JSON.stringify({
    receipt_policy: 'required', program_completion_required: false,
    delivery_phase: 'buildout', probes: [], lesson_execution: budget,
    lessons: [{ led: 'LED-1', check: 'printf side-effect > lesson-side-effect' }],
  }));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return { root, control, processDir };
}
function config(f, patch) {
  const file = path.join(f.processDir, 'reconcile.config.json');
  fs.writeFileSync(file, JSON.stringify({ ...JSON.parse(fs.readFileSync(file, 'utf8')), ...patch }));
}
function run(f, args = []) {
  return spawnSync(process.execPath, [path.join(f.processDir, 'reconcile.mjs'), ...args], {
    cwd: f.root, encoding: 'utf8', timeout: 15000, maxBuffer: 2 * 1024 * 1024,
  });
}
function snapshot(root) {
  const entries = [];
  function visit(dir) {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, item.name);
      if (item.isDirectory()) visit(file);
      else entries.push([path.relative(root, file), createHash('sha256').update(fs.readFileSync(file)).digest('hex')]);
    }
  }
  visit(root);
  return entries.sort((a, b) => a[0].localeCompare(b[0]));
}

test('quick/read-only audits never run lessons or asset examples and never update project files', t => {
  const f = fixture(t);
  fs.mkdirSync(path.join(f.control, 'decisions', 'assets'), { recursive: true });
  fs.writeFileSync(path.join(f.processDir, 'assets-runner.mjs'), "import fs from 'node:fs'; fs.writeFileSync('asset-side-effect', 'ran');\n");
  fs.writeFileSync(path.join(f.control, '.lessons-stats.json'), '{"existing":{"fireCount":9}}\n');
  const before = snapshot(f.root);
  for (const args of [quick, ['--read-only'], ['--profile=quick']]) {
    const result = run(f, args);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /full verification NOT RUN.*incomplete coverage/);
    assert.match(result.stdout, /Skipped:.*lesson.*asset.*program/);
    assert.deepEqual(snapshot(f.root), before);
  }
});

test('quick/read-only still rejects forged review receipts and legacy policy', t => {
  const f = fixture(t);
  config(f, { delivery_phase: null });
  fs.appendFileSync(path.join(f.root, 'BACKLOG.md'), '| T-1 | Broken review | 🔨 | SPEC.md | PASS[REV:aaaaaaaaaaaa] | — |\n');
  const before = snapshot(f.root);
  const forged = run(f, quick);
  assert.equal(forged.status, 1);
  assert.match(forged.stdout, /review receipt:/);
  assert.deepEqual(snapshot(f.root), before);
  config(f, { receipt_policy: 'legacy' });
  const legacy = run(f, quick);
  assert.equal(legacy.status, 1);
  assert.match(legacy.stdout, /receipt_policy=.*legacy/);
  assert.equal(fs.existsSync(path.join(f.root, 'lesson-side-effect')), false);
});

test('quick/read-only preserves frontend acceptance and RUNAWAY hard gates', t => {
  const f = fixture(t);
  fs.appendFileSync(path.join(f.root, 'BACKLOG.md'), '| T-UI | Forged acceptance | ✅ | PAGE.md | — | PASS:aaaaaaaaaaaa |\n');
  const before = snapshot(f.root), forged = run(f, quick);
  assert.equal(forged.status, 1);
  assert.match(forged.stdout, /frontend receipt:.*completion event/);
  assert.deepEqual(snapshot(f.root), before);
  fs.writeFileSync(path.join(f.root, 'BACKLOG.md'), '# Oversized ledger\n' + 'small line\n'.repeat(6500));
  const runaway = run(f, quick);
  assert.equal(runaway.status, 1);
  assert.match(runaway.stdout, /\[ERROR\] backlog-health.mjs: BACKLOG RUNAWAY/);
  assert.equal(fs.existsSync(path.join(f.root, 'lesson-side-effect')), false);
});

test('full is backward-compatible as the default and reports failed or timed-out lessons as errors', t => {
  const f = fixture(t);
  const passed = run(f);
  assert.equal(passed.status, 0, passed.stdout + passed.stderr);
  assert.equal(fs.readFileSync(path.join(f.root, 'lesson-side-effect'), 'utf8'), 'side-effect');
  assert.match(passed.stdout, /lesson LED-1: start/);
  assert.match(passed.stdout, /lesson LED-1: hold \(\d+ ms\)/);
  assert.equal(fs.existsSync(path.join(f.control, '.lessons-stats.json')), true);
  config(f, { lessons: [{ led: 'FAIL', check: "printf 'specific failure' >&2; exit 9" }, { led: 'SLOW', check: 'sleep 20', timeout_ms: 50 }] });
  const failed = run(f, ['--profile', 'full', '--concise']);
  assert.equal(failed.status, 1, failed.stdout + failed.stderr);
  assert.match(failed.stdout, /specific failure/);
  assert.match(failed.stdout, /FAIL RECURRED/);
  assert.match(failed.stdout, /SLOW: timeout/);
  assert.match(failed.stdout, /incomplete, NOT PASS/);
  assert.doesNotMatch(failed.stdout, /reconcile clean/);
});

test('unknown budgets and write-capable read-only options fail before command execution', t => {
  const f = fixture(t);
  config(f, { lesson_execution: undefined });
  const full = run(f);
  assert.equal(full.status, 1);
  assert.match(full.stdout, /lesson checks NOT RUN/);
  assert.equal(fs.existsSync(path.join(f.root, 'lesson-side-effect')), false);
  const before = snapshot(f.root);
  for (const args of [[...quick, '--consolidate'], ['--read-only', '--anti-check'], ['--profile', 'unknown']]) {
    const result = run(f, args);
    assert.equal(result.status, 2);
    assert.deepEqual(snapshot(f.root), before);
  }
});

test('knowledge and backlog warnings remain visible without becoming hard errors', t => {
  const f = fixture(t);
  fs.mkdirSync(path.join(f.root, 'docs', 'features', 'feature'), { recursive: true });
  fs.writeFileSync(path.join(f.root, 'docs', 'features', 'feature', 'README.md'), '# Missing truth marker\n');
  fs.writeFileSync(path.join(f.processDir, 'knowledge.config.json'), JSON.stringify({
    project_root: '../..', docs_dir: '../../docs', features_dir: '../../docs/features',
    feature_map: { 'FEAT-1': { dir: 'feature', contract_globs: [] } },
  }));
  fs.appendFileSync(path.join(f.root, 'BACKLOG.md'), '| T-1 | Queue debt | 🔨 待办 | SPEC.md | — | — |\n');
  const before = snapshot(f.root);
  const result = run(f, quick);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /\[WARN\] docs-health.mjs:/);
  assert.match(result.stdout, /\[WARN\] knowledge-coverage.mjs:/);
  assert.match(result.stdout, /\[WARN\] knowledge-drift.mjs:/);
  assert.match(result.stdout, /\[WARN\] backlog-health.mjs:/);
  assert.doesNotMatch(result.stdout, /docs-health.mjs: clean|knowledge-coverage.mjs: clean|knowledge-drift.mjs: clean/);
  assert.deepEqual(snapshot(f.root), before);
});

test('quick does not invoke program fresh verification when SHIP claims readiness', t => {
  const f = fixture(t);
  fs.mkdirSync(path.join(f.control, 'program'), { recursive: true });
  fs.writeFileSync(path.join(f.control, 'program', 'program.config.json'), '{}\n');
  fs.writeFileSync(path.join(f.processDir, 'program-gate.mjs'), "import fs from 'node:fs'; fs.writeFileSync('program-side-effect', 'ran');\n");
  const file = path.join(f.control, 'ARTIFACT_MANIFEST.yaml');
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('"5-ship":\n    status: "not-started"', '"5-ship":\n    status: "needs-user-confirmation"'));
  const before = snapshot(f.root), result = run(f, quick);
  assert.match(result.stdout, /no cross-project GO is issued/);
  assert.deepEqual(snapshot(f.root), before);
});

test('Stop and observer hooks use the quick read-only interface', t => {
  const f = fixture(t);
  const before = snapshot(f.root);
  const env = { ...process.env, CODEX_PROJECT_DIR: f.root };
  delete env.CLAUDE_PROJECT_DIR;
  const stop = spawnSync('bash', [path.join(SKILL, 'templates', 'hooks', 'stop-reconcile.sh')], { env, encoding: 'utf8', timeout: 15000 });
  assert.equal(stop.status, 0, stop.stdout + stop.stderr);
  assert.match(stop.stdout, /quick read-only control audit only/);
  const observer = spawnSync('bash', [path.join(SKILL, 'templates', 'hooks', 'post-tool-observe.sh')], {
    env, encoding: 'utf8', timeout: 15000, input: JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: 'BACKLOG.md' } }),
  });
  assert.equal(observer.status, 0, observer.stdout + observer.stderr);
  assert.deepEqual(snapshot(f.root), before);
});
