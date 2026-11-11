import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), "utf8");

test("BUILD scopes optional cleanup to actual changes without adding governance", () => {
  const build = read("workflows/v3-4-build.md");
  const gate = read("gates/13-tdd-gate.md");
  const agent = read("process/harness/coding-agent.md");

  for (const source of [build, gate, agent]) {
    assert.match(source, /RED|失败测试/i);
    assert.match(source, /GREEN|变绿|通过/i);
    assert.match(source, /行为不变|behavior-preserving/i);
    assert.match(source, /重跑.*聚焦|rerun.*focused/is);
  }
  assert.match(build, /有实际修改才重跑/);
  assert.match(agent, /可选的行为不变整理/);

  const modules = JSON.parse(read("process/modules.config.example.json"));
  const steps = Object.values(modules.modules ?? {}).flatMap((module) => module.tasks ?? []);
  assert.equal(steps.some((step) => /refactor|重构/i.test(String(step))), false);
  assert.doesNotMatch(build + gate, /REFRACTOR[_ -](?:LEDGER|ARTIFACT|STAGE)|重构(?:台账|工件|阶段)/i);
});

test("BUILD selects useful RED cases and does not manufacture ceremonial tests", () => {
  const build = read("workflows/v3-4-build.md");
  const gate = read("gates/13-tdd-gate.md");
  const combined = `${build}\n${gate}`;

  assert.match(combined, /bug|缺陷/i);
  assert.match(combined, /parser|解析器/i);
  assert.match(combined, /data|数据/i);
  assert.match(combined, /security|安全/i);
  assert.match(combined, /探索性\s*UI|exploratory UI/i);
  assert.match(combined, /纯样式|style-only/i);
  assert.match(combined, /文档|documentation/i);
  assert.match(combined, /不.*(?:制造|强求|伪造).*失败测试|do not manufacture.*failing test/is);
});

test("界面语言按实际产品需求启用，不制造第二语言与空语言包", () => {
  const ui = read("rules/ui-implementation-rules.md");
  assert.match(ui, /中文产品可只支持中文/);
  assert.match(ui, /不为脚手架预设第二语言/);
  assert.match(ui, /同步所有已声明语言/);
  assert.match(ui, /键一致性检查/);
  assert.match(ui, /无界面的项目不建语言包/);
  assert.doesNotMatch(ui, /at least one additional supported locale|必须.*zh-CN.*en-US/i);
});

test("BUILD carries compact placement, naming, and comment hygiene without another handbook", () => {
  const build = read("workflows/v3-4-build.md");

  assert.match(build, /谁拥有|owner/i);
  assert.match(build, /Create\s*\/\s*Modify\s*\/\s*Test/i);
  assert.match(build, /不应触碰|must not touch/i);
  assert.match(build, /同一概念.*同名|same concept.*same name/is);
  assert.match(build, /注释.*为什么|comments?.*why/is);
  assert.match(build, /不.*复述代码|do not narrate.*code/is);
});

test("obsolete duplicate backend TDD rule is removed from the active skill", () => {
  assert.equal(fs.existsSync(path.join(ROOT, "rules/backend-tdd-rules.md")), false);
});
