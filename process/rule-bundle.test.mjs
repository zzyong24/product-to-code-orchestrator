import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  collectRuleBundle, installRuleBundle, preflightRuleBundle,
  projectRuleBundle, verifyRuleBundle,
} from "./rule-bundle.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL = path.resolve(HERE, "..");

function fixture(t) {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "rule bundle "));
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  const source = path.join(parent, "source installation");
  const processRoot = path.join(parent, "project", "orchestrator", "process");
  fs.mkdirSync(processRoot, { recursive: true });
  const put = (relative, data) => {
    const file = path.join(source, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, data);
  };
  put("VERSION", "1.0.0\n");
  put("SKILL.md", "# Source\n");
  put("tools/init-module.sh", "# module bootstrap\n");
  put("tools/init-program.sh", "# program bootstrap\n");
  put("rules/global.md", "# Rule\nSee [decision](../decisions/patterns/shared.md).\n"
    + "Project outputs: `orchestrator/SYSTEM_ARCHITECTURE.md`, `docs/features/FEAT-001.md`, `PRODUCT_SPEC.md`.\n");
  put("prompts/review.md", "# Review\n`rules/global.md`\n");
  put("workflows/build.md", "# Build\n");
  put("gates/pass.md", "# Gate\n");
  put("templates/PRODUCT.md", "# Product\n[generated file](./does-not-exist.md)\n");
  put("templates/knowledge/DYNAMIC_TEMPLATE.md", "# Dynamic module template\n");
  put("decisions/patterns/shared.md", "# Decision\n[gate](../../gates/pass.md)\n");
  put("docs/verification/large-evidence.md", "# Not an installed rule\n");
  put("process/ignored.test.mjs", "// no tests in reading bundle\n");
  return { parent, source, processRoot, bundleRoot: path.join(processRoot, "rule-bundle") };
}

function pin(processRoot, manifest, source = "/missing/source") {
  fs.writeFileSync(path.join(processRoot, ".skill-version"),
    `version=${manifest.skill_version}\nskill_dir=${source}\nrule_bundle_version=${manifest.skill_version}\nrule_bundle_sha256=${manifest.content_sha256}\n`);
}

test("bundle freezes a deterministic documentation closure and keeps dynamic templates without historical evidence", (t) => {
  const f = fixture(t);
  const first = collectRuleBundle(f.source);
  const second = collectRuleBundle(f.source);
  assert.deepEqual(first.manifest, second.manifest);
  assert.ok(first.manifest.files["decisions/patterns/shared.md"]);
  assert.ok(first.manifest.files["templates/knowledge/DYNAMIC_TEMPLATE.md"]);
  assert.equal(Object.keys(first.manifest.files).some((name) => /docs\/|\.test\./.test(name)), false);
  const manifest = installRuleBundle(f.source, f.processRoot);
  pin(f.processRoot, manifest);
  assert.equal(verifyRuleBundle(f.bundleRoot).skill_version, "1.0.0");
  assert.equal(projectRuleBundle(f.processRoot).manifest.content_sha256, manifest.content_sha256);

  // An upstream upgrade does not change an un-updated project's rule source.
  fs.appendFileSync(path.join(f.source, "rules/global.md"), "\nnew source rule\n");
  fs.writeFileSync(path.join(f.source, "VERSION"), "2.0.0\n");
  assert.equal(projectRuleBundle(f.processRoot).manifest.skill_version, "1.0.0");
  assert.doesNotMatch(fs.readFileSync(path.join(f.bundleRoot, "rules/global.md"), "utf8"), /new source rule/);
  const next = installRuleBundle(f.source, f.processRoot);
  pin(f.processRoot, next);
  assert.equal(next.skill_version, "2.0.0");
  assert.notEqual(next.content_sha256, manifest.content_sha256);
});

test("bundle rejects altered, missing, unrecorded or rewritten-manifest contents without local fallback", async (t) => {
  for (const kind of ["edited", "missing", "extra", "manifest", "directory", "version"]) {
    await t.test(kind, (t) => {
      const f = fixture(t);
      const manifest = installRuleBundle(f.source, f.processRoot);
      pin(f.processRoot, manifest, f.source);
      const rule = path.join(f.bundleRoot, "rules/global.md");
      if (kind === "edited") fs.appendFileSync(rule, "\nlocal changes\n");
      if (kind === "missing") fs.unlinkSync(rule);
      if (kind === "extra") fs.writeFileSync(path.join(f.bundleRoot, "rules/injected.md"), "injected");
      if (kind === "manifest") {
        const value = { ...manifest, content_sha256: "0".repeat(64) };
        fs.writeFileSync(path.join(f.bundleRoot, "manifest.json"), JSON.stringify(value));
      }
      if (kind === "version") {
        fs.writeFileSync(path.join(f.bundleRoot, "manifest.json"), JSON.stringify({ ...manifest, skill_version: "forged" }));
      }
      if (kind === "directory") fs.rmSync(f.bundleRoot, { recursive: true });
      assert.throws(() => projectRuleBundle(f.processRoot), /rule bundle/);
      assert.throws(() => preflightRuleBundle(f.source, f.processRoot), /更新.*停止/);
      assert.equal(fs.existsSync(path.join(path.dirname(f.processRoot), ".rule-bundle-update-candidates", manifest.content_sha256, "manifest.json")), true);
      if (kind === "edited") assert.match(fs.readFileSync(rule, "utf8"), /local changes/);
    });
  }
});

test("missing reference closure and symlink entries are rejected", (t) => {
  const f = fixture(t);
  fs.unlinkSync(path.join(f.source, "decisions/patterns/shared.md"));
  assert.throws(() => collectRuleBundle(f.source), /缺失/);
  fs.symlinkSync(path.join(f.source, "rules/global.md"), path.join(f.source, "decisions/patterns/shared.md"));
  assert.throws(() => collectRuleBundle(f.source), /symlink/);
});

test("CLI accepts a skill-manager symlink, anchors the version and preserves a changed package", (t) => {
  const f = fixture(t);
  const alias = path.join(f.parent, "skill alias");
  fs.symlinkSync(SKILL, alias);
  const run = () => spawnSync(process.execPath, [
    path.join(alias, "process/rule-bundle.mjs"), "install", f.source, f.processRoot,
  ], { encoding: "utf8" });
  let result = run();
  assert.equal(result.status, 0, result.stderr + result.stdout);
  assert.equal(projectRuleBundle(f.processRoot).manifest.skill_version, "1.0.0");
  fs.appendFileSync(path.join(f.bundleRoot, "rules/global.md"), "\nproject-owned decision\n");
  const before = fs.readFileSync(path.join(f.processRoot, ".skill-version"), "utf8");
  result = run();
  assert.equal(result.status, 3);
  assert.equal(fs.readFileSync(path.join(f.processRoot, ".skill-version"), "utf8"), before);
  assert.match(fs.readFileSync(path.join(f.bundleRoot, "rules/global.md"), "utf8"), /project-owned/);
});

test("source bundle covers every planner pack reference", () => {
  const bundle = collectRuleBundle(SKILL);
  const planner = fs.readFileSync(path.join(HERE, "context-plan.mjs"), "utf8");
  for (const [, reference] of planner.matchAll(/"((?:rules|prompts|workflows|gates|templates)\/[^"]+)"/g)) {
    assert.ok(bundle.manifest.files[reference], `planner requires ${reference}`);
  }
  assert.ok(bundle.manifest.files["process/README.md"], "pack keeps the installation/check-budget guidance linked by SKILL");
});
