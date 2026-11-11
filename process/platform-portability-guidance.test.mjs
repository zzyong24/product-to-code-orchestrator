import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const processDir = path.dirname(fileURLToPath(import.meta.url));
const colocatedRoot = path.resolve(processDir, "..");
const stampPath = path.join(processDir, ".skill-version");
const installedSkillDir = existsSync(stampPath)
  ? readFileSync(stampPath, "utf8").match(/^skill_dir=(.+)$/m)?.[1]?.trim()
  : undefined;
const root = existsSync(path.join(colocatedRoot, "SKILL.md"))
  ? colocatedRoot
  : installedSkillDir && existsSync(path.join(installedSkillDir, "SKILL.md"))
    ? installedSkillDir
    : colocatedRoot;
const read = (relative) => readFileSync(path.join(root, relative), "utf8");

test("skill entry treats OS integration as a contract, not an inline command", () => {
  const skill = read("SKILL.md");
  assert.match(skill, /操作系统集成需核对/);
  assert.match(skill, /命令\/API.*参数路径.*完成语义.*用户文案/s);
});

test("contract and test templates require a supported-platform execution matrix", () => {
  const contract = read("templates/SERVICE_CONTRACT_TEMPLATE.md");
  const testPlan = read("templates/TEST_PLAN_TEMPLATE.md");
  for (const source of [contract, testPlan]) {
    assert.match(source, /platform_execution_matrix/);
    assert.match(source, /命令.*API/);
    assert.match(source, /完成语义/);
    assert.match(source, /用户文案/);
  }
});

test("BUILD and SHIP gates require platform tests plus target-host evidence", () => {
  const tdd = read("gates/13-tdd-gate.md");
  const integration = read("gates/14-integration-gate.md");
  const prelaunch = read("prompts/prelaunch-engineering-audit.md");
  assert.match(tdd, /platform_execution_matrix/);
  assert.match(tdd, /操作系统/);
  assert.match(integration, /每个目标系统/);
  assert.match(integration, /最终安装产物/);
  assert.match(prelaunch, /系统命令与原生 API/);
  assert.match(prelaunch, /无 shell 的参数数组/);
});

test("field lessons retain reusable portability evidence without project-only branding", () => {
  const lessons = read("rules/field-lessons.md");
  assert.match(lessons, /跨平台桌面与发布闭环/);
  assert.match(lessons, /不可变构建清单/);
  assert.match(lessons, /目标文件系统或主机上的实际效果/);
  assert.match(lessons, /输入版本固定，重试有独立标识/);
  assert.doesNotMatch(lessons, /智溯AI/);
});
