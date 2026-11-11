import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
// Invalid/missing input deliberately exercises each main without writing project state.
const CASES = [
  { file: "autonomy-guard.mjs", args: ["begin"], status: 2, output: /begin requires --task/ },
  { file: "frontend-validation.mjs", args: ["validate"], status: 1, output: /用法: frontend-validation/ },
  { file: "governance-guard.mjs", args: ["task-preflight"], status: 2, output: /task-preflight requires --task/ },
  { file: "research-gate.mjs", args: ["observe"], status: 1, output: /用法: research-gate/ },
  { file: "reviewctl.mjs", args: [], status: 1, output: /用法: reviewctl/ },
  { file: "lessonctl.mjs", args: ["audit"], status: 0, output: /lesson lifecycle clean/ },
  { file: "timeout-budget.mjs", args: [], status: 2, output: /usage: timeout-budget/ },
];

test("各运行时 CLI 经脚本或父目录别名调用都真实进入 main", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-cli-alias-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const directoryAlias = path.join(root, "runtime directory alias");
  fs.symlinkSync(HERE, directoryAlias, "dir");
  for (const item of CASES) {
    await t.test(item.file, () => {
      const scriptAlias = path.join(root, `script alias ${item.file}`);
      fs.symlinkSync(path.join(HERE, item.file), scriptAlias);
      for (const entry of [scriptAlias, path.join(directoryAlias, item.file)]) {
        const result = spawnSync(process.execPath, [entry, ...item.args], { cwd: root, encoding: "utf8" });
        assert.equal(result.status, item.status, `${entry}\n${result.stderr}\n${result.stdout}`);
        assert.match(result.stdout + result.stderr, item.output, `${entry} 不得静默退出或因模块加载错误伪装已执行 main`);
      }
    });
  }
  assert.equal(fs.existsSync(path.join(root, "orchestrator")), false, "入口探针不应修改项目状态");
});

test("各 CLI 从文件和 stdin 经别名 import 时不执行 main", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-cli-import-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const directoryAlias = path.join(root, "runtime directory alias");
  fs.symlinkSync(HERE, directoryAlias, "dir");
  const imports = CASES.map(({ file }) => `await import(${JSON.stringify(pathToFileURL(path.join(directoryAlias, file)).href)});`).join("\n");
  const source = `${imports}\nconsole.log("imports-only");\n`;
  const importer = path.join(root, "importer.mjs");
  fs.writeFileSync(importer, source);
  for (const [args, input] of [[[importer], undefined], [["--input-type=module", "-"], source]]) {
    const result = spawnSync(process.execPath, args, { cwd: root, input, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "imports-only\n");
    assert.equal(result.stderr, "");
  }
  assert.equal(fs.existsSync(path.join(root, "orchestrator")), false);
});
