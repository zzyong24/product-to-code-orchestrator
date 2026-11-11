import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { diagnoseProject } from "./project-doctor.mjs";

const SCRIPT = fileURLToPath(new URL("./project-doctor.mjs", import.meta.url));
const PROC = "orchestrator/process";
const sha = (value) => createHash("sha256").update(value).digest("hex");
function write(root, file, value) {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), typeof value === "string" ? value : JSON.stringify(value, null, 2));
}
function fixture(t, { bundle = true } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "project-doctor-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const files = {
    VERSION: sha("3.29.0\n"),
    "rules/global-rules.md": sha("# Rules\n"),
    "prompts/stage-router.md": sha("# Router\n"),
  };
  const hash = sha(JSON.stringify(Object.entries(files).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)));
  write(root, `${PROC}/.skill-version`, `version=3.29.0\nskill_dir=/machine-local/skill\n${bundle ? `rule_bundle_version=3.29.0\nrule_bundle_sha256=${hash}\n` : ""}`);
  write(root, `${PROC}/.vendor-manifest.json`, { schema: "orchestrator-engine-vendor/v1", skill_version: "3.29.0", files: {} });
  if (bundle) {
    write(root, `${PROC}/rule-bundle/VERSION`, "3.29.0\n");
    write(root, `${PROC}/rule-bundle/rules/global-rules.md`, "# Rules\n");
    write(root, `${PROC}/rule-bundle/prompts/stage-router.md`, "# Router\n");
    write(root, `${PROC}/rule-bundle/manifest.json`, { schema: "orchestrator-rule-bundle/v1", skill_version: "3.29.0", files, content_sha256: hash });
  }
  write(root, ".claude/hooks/session-start.sh", "#!/bin/sh\nexit 0\n");
  write(root, ".claude/settings.json", { hooks: { SessionStart: [{ hooks: [{ type: "command", command: 'bash "$CLAUDE_PROJECT_DIR/.claude/hooks/session-start.sh"' }] }] } });
  write(root, "AGENTS.md", "按技能 `prompts/stage-router.md` 与 `rules/global-rules.md` 执行。\n");
  return root;
}
function hook(root, event, command, registry = ".claude/settings.json") {
  write(root, registry, { custom_setting: "keep", hooks: { [event]: [{ hooks: [{ type: "command", command }] }] } });
}
const codes = (report) => report.findings.map((f) => f.code);
function cli(root, ...args) {
  return spawnSync(process.execPath, [SCRIPT, "--root", root, "--json", ...args], { encoding: "utf8" });
}
function snapshot(root) {
  const result = {};
  function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      const file = path.join(dir, name);
      if (fs.statSync(file).isDirectory()) walk(file);
      else result[path.relative(root, file)] = fs.readFileSync(file).toString("base64");
    }
  }
  walk(root);
  return result;
}

test("fresh 形态规则包可独立核验；无 GitHub workflow 不要求 CI", (t) => {
  const root = fixture(t);
  const result = cli(root);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.schema, "orchestrator-project-doctor/v1");
  assert.deepEqual(report.summary, { errors: 0, warnings: 0, unknown: 0 });
  assert.deepEqual(report.findings, []);
});

test("脚本与目录软链接调用仍输出报告；import 不执行 CLI", (t) => {
  const root = fixture(t);
  const linkedScript = path.join(root, "doctor-link.mjs");
  const alias = path.join(root, "directory-alias");
  fs.symlinkSync(SCRIPT, linkedScript);
  fs.symlinkSync(root, alias, "dir");
  const throughAlias = path.join(alias, "doctor-link.mjs");
  const result = spawnSync(process.execPath, [throughAlias, "--root", alias, "--json"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.stdout.trim(), "软链接 CLI 不得静默退出");
  const report = JSON.parse(result.stdout);
  assert.equal(report.schema, "orchestrator-project-doctor/v1");
  assert.equal(report.root, alias);
  assert.equal(report.summary.errors, 0);

  const importer = path.join(root, "import-doctor.mjs");
  write(root, "import-doctor.mjs", `import ${JSON.stringify(pathToFileURL(throughAlias).href)};\nconsole.log("import-only");\n`);
  const imported = spawnSync(process.execPath, [importer, "--root", root, "--json"], { encoding: "utf8" });
  assert.equal(imported.status, 0, imported.stderr);
  assert.equal(imported.stdout, "import-only\n");
});

test("旧项目无规则包仅提示迁移与本机依赖；固定包缺失是确定错误", (t) => {
  const root = fixture(t, { bundle: false });
  const old = cli(root);
  assert.equal(old.status, 0);
  assert.ok(codes(JSON.parse(old.stdout)).includes("LOCAL_SKILL_DEPENDENCY"));
  write(root, `${PROC}/.skill-version`, "version=3.29.0\nrule_bundle_sha256=deadbeef\n");
  const pinned = cli(root);
  assert.equal(pinned.status, 1);
  assert.equal(JSON.parse(pinned.stdout).findings.find((f) => f.code === "RULE_BUNDLE_MISSING").severity, "error");
});

test("规则包内容、运行时清单与固定版本错配不能报健康", (t) => {
  const root = fixture(t);
  write(root, `${PROC}/rule-bundle/rules/global-rules.md`, "modified\n");
  assert.ok(codes(diagnoseProject(root)).includes("RULE_BUNDLE_INVALID"));
  write(root, `${PROC}/rule-bundle/rules/global-rules.md`, "# Rules\n");
  write(root, `${PROC}/.vendor-manifest.json`, { skill_version: "older", files: {} });
  assert.ok(codes(diagnoseProject(root)).includes("ENGINE_VERSION_MISMATCH"));
  const manifest = JSON.parse(fs.readFileSync(path.join(root, PROC, "rule-bundle/manifest.json"), "utf8"));
  manifest.skill_version = "older";
  write(root, `${PROC}/rule-bundle/manifest.json`, manifest);
  assert.ok(codes(diagnoseProject(root)).includes("RULE_BUNDLE_INVALID"));
});

test("旧 Stop 与 PostToolUse 的全量调用被发现；新 quick 及注释不误报", (t) => {
  const root = fixture(t);
  write(root, ".claude/hooks/stop.sh", "#!/bin/sh\nnode orchestrator/process/reconcile.mjs --concise\n");
  hook(root, "Stop", 'bash "$CLAUDE_PROJECT_DIR/.claude/hooks/stop.sh"');
  assert.ok(codes(diagnoseProject(root)).includes("LEGACY_FULL_RECONCILE_HOOK"));
  write(root, ".claude/hooks/observe.sh", `const result = spawnSync(process.execPath, ['orchestrator/process/reconcile.mjs'], { cwd: root });\n`);
  hook(root, "PostToolUse", "node .claude/hooks/observe.sh");
  assert.ok(codes(diagnoseProject(root)).includes("LEGACY_FULL_RECONCILE_HOOK"));
  write(root, ".claude/hooks/stop.sh", "# node orchestrator/process/reconcile.mjs\nnode orchestrator/process/reconcile.mjs --profile quick --read-only\n");
  hook(root, "Stop", "bash .claude/hooks/stop.sh");
  assert.ok(!codes(diagnoseProject(root)).includes("LEGACY_FULL_RECONCILE_HOOK"));
});

test("失效绝对 hook 路径是错误，复杂或自定义命令只记 unknown", (t) => {
  const root = fixture(t);
  hook(root, "Stop", `bash '${path.join(root, "old-checkout/.codex/hooks/stop.sh")}'`, ".codex/hooks.json");
  let result = cli(root);
  assert.equal(result.status, 1);
  assert.ok(codes(JSON.parse(result.stdout)).includes("HOOK_TARGET_MISSING"));
  hook(root, "Stop", "custom-hook --check", ".codex/hooks.json");
  result = cli(root);
  assert.equal(result.status, 0);
  assert.ok(codes(JSON.parse(result.stdout)).includes("HOOK_COMMAND_UNKNOWN"));
  hook(root, "Stop", "bash -lc 'node orchestrator/process/reconcile.mjs'", ".codex/hooks.json");
  assert.ok(codes(diagnoseProject(root)).includes("HOOK_COMMAND_UNKNOWN"));
});

test("可被宿主支持的带注释配置保留 unknown；动态 profile 不凭 quick 字样报安全", (t) => {
  const root = fixture(t);
  write(root, ".claude/settings.local.json", '{\n // project custom JSON5\n "hooks": {},\n}\n');
  let result = cli(root);
  assert.equal(result.status, 0);
  assert.ok(codes(JSON.parse(result.stdout)).includes("HOST_CONFIG_FORMAT_UNKNOWN"));
  write(root, ".claude/settings.local.json", "[]\n");
  assert.equal(cli(root).status, 1);
  fs.unlinkSync(path.join(root, ".claude/settings.local.json"));
  write(root, ".claude/hooks/stop.sh", '# quick is recommended\nnode orchestrator/process/reconcile.mjs --profile "$PROFILE" --read-only\n');
  hook(root, "Stop", "bash .claude/hooks/stop.sh");
  assert.ok(codes(diagnoseProject(root)).includes("HOOK_RECONCILE_MODE_UNKNOWN"));
  write(root, ".claude/hooks/stop.sh", "node orchestrator/process/reconcile.mjs --profile=full --read-only\n");
  assert.ok(codes(diagnoseProject(root)).includes("LEGACY_FULL_RECONCILE_HOOK"));
});

test("诊断保留所有项目文件，绝不执行 shell、hook 或读取其写入指令", (t) => {
  const root = fixture(t), sentinel = path.join(root, "would-be-written");
  write(root, ".claude/hooks/custom.sh", `#!/bin/sh\ntouch '${sentinel}'\n`);
  hook(root, "Stop", "bash .claude/hooks/custom.sh");
  hook(root, "Stop", `touch '${sentinel}'; node orchestrator/process/reconcile.mjs`, ".codex/hooks.json");
  write(root, `${PROC}/reconcile.config.json`, { lessons: [{ check: `touch '${sentinel}'` }], project_owned: { keep: true } });
  const before = snapshot(root);
  assert.equal(cli(root).status, 0);
  assert.deepEqual(snapshot(root), before);
  assert.equal(fs.existsSync(sentinel), false);
});

test("项目入口已删除规则与缺失本地引用给出可操作位置", (t) => {
  const root = fixture(t);
  write(root, "CLAUDE.md", "规范见 `rules/code-retrieval-rules.md` 与 [本地](orchestrator/prompts/missing.md)。");
  const report = diagnoseProject(root);
  const refs = report.findings.filter((f) => f.code === "ENTRY_RULE_REFERENCE_MISSING");
  assert.equal(refs.length, 2);
  assert.deepEqual(refs.map((f) => f.severity).sort(), ["error", "warning"]);
  assert.equal(refs.every((f) => f.path === "CLAUDE.md" && f.remedy), true);
});

test("CI 注释和 echo 不算执行；明确 Node 冲突提示，required check 保持未知", (t) => {
  const root = fixture(t);
  write(root, "package.json", { engines: { node: ">=25 <26" } });
  write(root, ".github/workflows/verify.yml", `name: Verify
# node orchestrator/process/reconcile.mjs
jobs:
  verify:
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - run: echo "node orchestrator/process/reconcile.mjs"
`);
  let report = diagnoseProject(root);
  assert.ok(codes(report).includes("GOVERNANCE_CI_NOT_DETECTED"));
  assert.ok(codes(report).includes("WORKFLOW_NODE_RANGE_MISMATCH"));
  assert.equal(report.findings.find((f) => f.code === "CI_REQUIRED_CHECKS_UNKNOWN").severity, "unknown");
  write(root, ".github/workflows/verify.yml", `jobs:
  verify:
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: "\${{ matrix.node }}"
      - run: |
          # Older command: node orchestrator/process/reconcile.mjs
          node orchestrator/process/reconcile.mjs --profile quick --read-only
`);
  report = diagnoseProject(root);
  assert.ok(!codes(report).includes("GOVERNANCE_CI_NOT_DETECTED"));
  assert.ok(!codes(report).includes("WORKFLOW_NODE_RANGE_MISMATCH"));
  assert.ok(codes(report).includes("CI_REQUIRED_CHECKS_UNKNOWN"));
});

test("非法根目录和参数返回 2，缺运行时返回结构化错误 1", (t) => {
  const root = fixture(t);
  assert.equal(cli(root, "--repair").status, 2);
  assert.equal(cli(path.join(root, "absent")).status, 2);
  const empty = path.join(root, "empty");
  fs.mkdirSync(empty);
  const result = cli(empty);
  assert.equal(result.status, 1);
  assert.ok(codes(JSON.parse(result.stdout)).includes("PROJECT_ENGINE_MISSING"));
});
