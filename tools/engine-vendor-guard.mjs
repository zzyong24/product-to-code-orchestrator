#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const SCHEMA = "orchestrator-engine-vendor/v1";
const MIGRATION_SCHEMA = "orchestrator-engine-migration/v1";
const MANIFEST = ".vendor-manifest.json";
const REQUIRED_ENGINE_FILES = [
  "program-gate.mjs",
  "taskctl.mjs",
  "reviewctl.mjs",
  "reconcile.mjs",
  "state-lock.mjs",
  "context-plan.mjs",
  "context-compile.mjs",
  "rule-bundle.mjs",
  "project-doctor.mjs",
  "lesson-runner.mjs",
  "parallel-isolation.mjs",
  "delivery-phase.mjs",
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const portable = (value) => value.split(path.sep).join("/");
const isProjectOwned = (relative) =>
  relative.startsWith("rule-bundle/") ||
  /(?:^|\/)\.vendor-manifest\.json$/.test(relative) ||
  /(?:^|\/)\.skill-version$/.test(relative) ||
  /\.config\.json$/.test(relative) ||
  /-baseline\.json$/.test(relative);
const isRuntimeFile = (relative) =>
  !relative.endsWith(".test.mjs") &&
  !/(?:^|\/)README\.md$/.test(relative) &&
  relative !== "harness/semantics-test.sh";

function safeRelative(value, label) {
  if (
    typeof value !== "string" ||
    !value ||
    value.includes("\\") ||
    path.isAbsolute(value) ||
    value.split("/").includes("..")
  ) die(`${label} 含不安全路径: ${String(value)}`, 3);
  return value;
}

function die(message, code = 2) {
  console.error(`✗ ${message}`);
  process.exit(code);
}

function safeRoot(value, label) {
  if (!value) die(`${label} 不能为空`);
  const root = path.resolve(value);
  if (!existsSync(root) || !lstatSync(root).isDirectory()) die(`${label} 不是目录: ${root}`);
  return root;
}

function verifyRequiredEntrypoints(source, { report = false } = {}) {
  const skillRoot = path.dirname(source);
  const skillFile = path.join(skillRoot, "SKILL.md");
  if (!existsSync(skillFile) || !lstatSync(skillFile).isFile()) {
    die(`required entrypoint audit 找不到 SKILL.md: ${skillFile}`, 3);
  }

  const required = new Set();
  for (const relative of REQUIRED_ENGINE_FILES) {
    safeRelative(relative, "REQUIRED_ENGINE_FILES");
    if (required.has(relative)) die(`REQUIRED_ENGINE_FILES 重复: ${relative}`, 3);
    required.add(relative);
    const file = path.join(source, relative);
    if (!existsSync(file) || !lstatSync(file).isFile()) {
      die(`REQUIRED_ENGINE_FILES 声明但 skill process 缺文件: ${relative}`, 3);
    }
  }

  const skill = readFileSync(skillFile, "utf8");
  const startupEntrypoints = [
    ...skill.matchAll(/\borchestrator\/process\/([A-Za-z0-9_.-]+\.mjs)\b/g),
  ].map((match) => match[1]);
  for (const entrypoint of new Set(startupEntrypoints)) {
    if (!required.has(entrypoint)) {
      die(
        `${entrypoint} 由 SKILL.md 声明为 startup entrypoint，但不在 REQUIRED_ENGINE_FILES`,
        3,
      );
    }
  }
  if (report) {
    console.log(
      `✓ required engine contract: ${required.size} managed files; ${new Set(startupEntrypoints).size} SKILL startup entrypoints`,
    );
  }
}

function filesBelow(root) {
  const out = new Map();
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) die(`vendored engine 不接受 symlink: ${absolute}`);
      if (entry.isDirectory()) {
        visit(absolute);
        continue;
      }
      if (!entry.isFile()) continue;
      const relative = portable(path.relative(root, absolute));
      if (!isProjectOwned(relative) && isRuntimeFile(relative)) {
        out.set(relative, sha256(readFileSync(absolute)));
      }
    }
  };
  visit(root);
  return out;
}

function treeHash(root) {
  const entries = [...filesBelow(root)].sort(([a], [b]) => a.localeCompare(b));
  return sha256(entries.map(([relative, hash]) => `${relative}\0${hash}`).join("\n"));
}

function writeVendorManifest(source, target, version) {
  const sourceFiles = filesBelow(source);
  const files = {};
  for (const [relative, expected] of [...sourceFiles].sort(([a], [b]) => a.localeCompare(b))) {
    const active = path.join(target, relative);
    if (!existsSync(active) || !lstatSync(active).isFile()) {
      die(`无法记录 vendor baseline，active engine 缺文件: ${relative}`);
    }
    const actual = sha256(readFileSync(active));
    if (actual !== expected) {
      die(`无法记录 vendor baseline，active engine 与 source 不同: ${relative}`);
    }
    files[relative] = actual;
  }
  const manifest = { schema: SCHEMA, skill_version: version || "unknown", files };
  const destination = path.join(target, MANIFEST);
  const temporary = `${destination}.tmp-${process.pid}`;
  mkdirSync(target, { recursive: true });
  writeFileSync(temporary, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
  renameSync(temporary, destination);
  return Object.keys(files).length;
}

function readManifest(target) {
  const file = path.join(target, MANIFEST);
  if (!existsSync(file)) return null;
  let value;
  try {
    value = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    die(`engine vendor manifest 无法解析，升级拒绝: ${error.message}`, 3);
  }
  if (
    !value ||
    Array.isArray(value) ||
    value.schema !== SCHEMA ||
    !value.files ||
    Array.isArray(value.files) ||
    typeof value.files !== "object"
  ) {
    die(`engine vendor manifest 不是 ${SCHEMA}，升级拒绝`, 3);
  }
  for (const [relative, hash] of Object.entries(value.files)) {
    if (
      !relative ||
      relative.includes("\\") ||
      path.isAbsolute(relative) ||
      relative.split("/").includes("..") ||
      !/^[a-f0-9]{64}$/.test(hash)
    ) {
      die(`engine vendor manifest 含不安全或无效条目: ${relative}`, 3);
    }
  }
  return value;
}

function check(source, target) {
  const incoming = filesBelow(source);
  const recorded = readManifest(target);
  const dirty = new Set();

  if (!recorded) {
    for (const [relative, incomingHash] of incoming) {
      const active = path.join(target, relative);
      if (!existsSync(active) || !lstatSync(active).isFile()) {
        dirty.add(relative);
        continue;
      }
      if (sha256(readFileSync(active)) !== incomingHash) dirty.add(relative);
    }
    if (dirty.size) {
      console.error(
        "✗ legacy engine 缺少可验证 vendor baseline；无法区分旧版本与项目本地扩展，升级 fail-closed。",
      );
    }
  } else {
    for (const [relative, recordedHash] of Object.entries(recorded.files)) {
      const active = path.join(target, relative);
      const incomingHash = incoming.get(relative);
      if (!existsSync(active) || !lstatSync(active).isFile()) {
        dirty.add(relative);
        continue;
      }
      const activeHash = sha256(readFileSync(active));
      if (activeHash === recordedHash) continue;
      // A human may already have completed the migration by replacing the active
      // core with the reviewed incoming version. That state is safe to re-baseline.
      if (incomingHash && activeHash === incomingHash) continue;
      dirty.add(relative);
    }
    for (const [relative, incomingHash] of incoming) {
      if (Object.hasOwn(recorded.files, relative)) continue;
      const active = path.join(target, relative);
      if (
        existsSync(active) &&
        (!lstatSync(active).isFile() || sha256(readFileSync(active)) !== incomingHash)
      ) {
        dirty.add(relative);
      }
    }
    if (dirty.size) {
      console.error(
        "✗ active vendored engine 含项目本地修改/扩展；升级在覆盖前 fail-closed。",
      );
    }
  }

  if (dirty.size) {
    for (const relative of [...dirty].sort()) console.error(`  - orchestrator/process/${relative}`);
    console.error(
      "先在独立 candidate 中迁移这些扩展并让 active core 与已审核的新 engine 一致，再重跑 --update；不得删除 manifest 绕过。",
    );
    process.exit(3);
  }
  console.log(recorded ? "✓ active engine matches recorded vendor baseline" : "✓ legacy engine equals incoming engine; baseline may be adopted");
}

function snapshot(source, target, version) {
  const count = writeVendorManifest(source, target, version);
  console.log(`✓ ${MANIFEST} records ${count} managed engine files`);
}

function verifyInstalled(target) {
  const manifest = readManifest(target);
  if (!manifest) die("初始化不完整或为 legacy engine：缺 .vendor-manifest.json；请使用 --update 审查迁移", 3);
  for (const relative of REQUIRED_ENGINE_FILES) {
    if (!Object.hasOwn(manifest.files, relative)) die(`初始化不完整：vendor baseline 未登记 ${relative}；请使用 --update`, 3);
  }
  for (const [relative, expected] of Object.entries(manifest.files)) {
    const file = path.join(target, relative);
    if (!existsSync(file) || !lstatSync(file).isFile() || sha256(readFileSync(file)) !== expected) {
      die(`已安装 engine 缺失或与 vendor baseline 不符：${relative}；保留项目内容，请使用 --update 审查迁移`, 3);
    }
  }
  console.log("✓ installed engine vendor baseline intact");
}

function readMigration(manifestFile) {
  const absolute = path.resolve(manifestFile ?? "");
  if (!existsSync(absolute) || !lstatSync(absolute).isFile()) die(`migration manifest 不存在: ${absolute}`, 3);
  let value;
  try { value = JSON.parse(readFileSync(absolute, "utf8")); }
  catch (error) { die(`migration manifest 无法解析: ${error.message}`, 3); }
  if (!value || Array.isArray(value) || value.schema !== MIGRATION_SCHEMA) {
    die(`migration manifest.schema 必须是 ${MIGRATION_SCHEMA}`, 3);
  }
  if (value.reviewed !== true || typeof value.reviewed_by !== "string" || !value.reviewed_by.trim()) {
    die("migration manifest 必须显式记录 reviewed=true 与 reviewed_by；candidate 尚未获审核", 3);
  }
  if (!/^[a-f0-9]{64}$/.test(value.candidate_tree_sha256 ?? "")) die("migration manifest 缺有效 candidate_tree_sha256", 3);
  const candidateRel = safeRelative(value.candidate_process, "candidate_process");
  const candidate = path.resolve(path.dirname(absolute), candidateRel);
  if (!candidate.startsWith(`${path.dirname(absolute)}${path.sep}`)) die("candidate_process 必须位于 migration manifest 目录内", 3);
  const requiredFiles = Array.isArray(value.required_files) ? value.required_files.map((item) => safeRelative(item, "required_files")) : [];
  if (!REQUIRED_ENGINE_FILES.every((file) => requiredFiles.includes(file))) {
    die(`required_files 必须包含 ${REQUIRED_ENGINE_FILES.join(", ")}`, 3);
  }
  if (!value.required_literals || Array.isArray(value.required_literals) || typeof value.required_literals !== "object") {
    die("required_literals 必须是 path -> non-empty literal[]", 3);
  }
  return { absolute, value, candidate, requiredFiles };
}

function adopt(source, target, migrationFile, version) {
  const migration = readMigration(migrationFile);
  const candidate = safeRoot(migration.candidate, "candidate process dir");
  const actualTreeHash = treeHash(candidate);
  if (actualTreeHash !== migration.value.candidate_tree_sha256) {
    die(`candidate hash 不匹配；审核后内容已变化（actual=${actualTreeHash}）`, 3);
  }
  // A reviewed candidate may merge capabilities, but core drift must first be upstreamed or
  // expressed through a supported extension point. Otherwise the next update would erase it.
  if (actualTreeHash !== treeHash(source)) {
    die("candidate 与当前 generic engine 不同；拒绝把未上游 core patch 伪装成 vendor baseline", 3);
  }
  for (const relative of migration.requiredFiles) {
    const file = path.join(candidate, relative);
    if (!existsSync(file) || !lstatSync(file).isFile()) die(`candidate 缺 required file: ${relative}`, 3);
  }
  for (const [relativeRaw, literals] of Object.entries(migration.value.required_literals)) {
    const relative = safeRelative(relativeRaw, "required_literals path");
    if (!Array.isArray(literals) || literals.length === 0 || literals.some((item) => typeof item !== "string" || !item)) {
      die(`required_literals.${relative} 必须是 non-empty literal[]`, 3);
    }
    const file = path.join(candidate, relative);
    if (!existsSync(file) || !lstatSync(file).isFile()) die(`required_literals 引用缺失文件: ${relative}`, 3);
    const content = readFileSync(file, "utf8");
    for (const literal of literals) if (!content.includes(literal)) die(`candidate ${relative} 缺审核要求 literal: ${literal}`, 3);
  }
  for (const [relative] of filesBelow(candidate)) {
    if (!relative.endsWith(".mjs")) continue;
    const syntax = spawnSync(process.execPath, ["--check", path.join(candidate, relative)], { encoding: "utf8" });
    if (syntax.status !== 0) die(`candidate Node 语法失败: ${relative}: ${(syntax.stderr || syntax.stdout).trim()}`, 3);
  }

  const parent = path.dirname(target);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const snapshots = path.join(parent, ".engine-snapshots");
  const snapshotRoot = path.join(snapshots, `adopt-${stamp}-${actualTreeHash.slice(0, 12)}`);
  const stage = path.join(parent, `.engine-adopt-stage-${process.pid}`);
  const hold = path.join(parent, `.engine-adopt-hold-${process.pid}`);
  if (existsSync(stage) || existsSync(hold) || existsSync(snapshotRoot)) die("engine adopt 临时/快照路径冲突", 3);
  mkdirSync(snapshotRoot, { recursive: true });
  cpSync(target, path.join(snapshotRoot, "process"), { recursive: true, errorOnExist: true });
  cpSync(candidate, stage, { recursive: true, errorOnExist: true });
  for (const [relative] of allFilesBelow(target)) {
    if (!isProjectOwned(relative) || relative === MANIFEST) continue;
    const destination = path.join(stage, relative);
    mkdirSync(path.dirname(destination), { recursive: true });
    cpSync(path.join(target, relative), destination, { force: true });
  }
  writeVendorManifest(source, stage, version);
  try {
    renameSync(target, hold);
    renameSync(stage, target);
    rmSync(hold, { recursive: true, force: true });
  } catch (error) {
    if (!existsSync(target) && existsSync(hold)) renameSync(hold, target);
    rmSync(stage, { recursive: true, force: true });
    die(`engine adopt 原子安装失败，active 已回滚: ${error.message}`, 3);
  }
  console.log(`✓ reviewed engine candidate adopted; previous active snapshot: ${path.relative(parent, snapshotRoot)}/process`);
}

function allFilesBelow(root) {
  const out = new Map();
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) die(`vendored engine 不接受 symlink: ${absolute}`);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) out.set(portable(path.relative(root, absolute)), sha256(readFileSync(absolute)));
    }
  };
  visit(root);
  return out;
}

function draft(candidate, manifestFile, version) {
  const destination = path.resolve(manifestFile ?? "");
  if (existsSync(destination)) {
    console.log(`· migration manifest already exists and was not overwritten: ${destination}`);
    return;
  }
  mkdirSync(path.dirname(destination), { recursive: true });
  const relative = portable(path.relative(path.dirname(destination), candidate));
  safeRelative(relative, "candidate_process");
  const value = {
    schema: MIGRATION_SCHEMA,
    candidate_process: relative,
    candidate_tree_sha256: treeHash(candidate),
    skill_version: version || "unknown",
    reviewed: false,
    reviewed_by: "",
    required_files: REQUIRED_ENGINE_FILES,
    required_literals: {
      "program-gate.mjs": ["release_identity", "--no-replace-objects", "PROGRAM_GATE_RELEASE_ROOT"],
      "taskctl.mjs": ["resume", "invalidated_acceptance", "auditResearchGates"],
    },
  };
  writeFileSync(destination, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
  console.log(`✓ migration manifest draft: ${destination}`);
}

const [command, sourceArg, targetArg, extra, adoptVersion] = process.argv.slice(2);
if (command === "verify-required") {
  const source = safeRoot(sourceArg, "skill process dir");
  verifyRequiredEntrypoints(source, { report: true });
  process.exit(0);
}
if (!["check", "verify-installed", "snapshot", "adopt", "draft"].includes(command ?? "")) {
  die("用法: engine-vendor-guard.mjs <verify-required|verify-installed|check|snapshot|adopt|draft> <skill-process-dir> [project-process-dir] [version | migration-manifest version]");
}
const source = safeRoot(sourceArg, "skill process dir");
verifyRequiredEntrypoints(source);
const target = safeRoot(targetArg, "project process dir");
if (command === "check") check(source, target);
else if (command === "verify-installed") verifyInstalled(target);
else if (command === "snapshot") snapshot(source, target, extra);
else if (command === "adopt") adopt(source, target, extra, adoptVersion);
else draft(target, extra, adoptVersion);
