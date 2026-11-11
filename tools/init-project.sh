#!/usr/bin/env bash
# One-command project bootstrap — turns SKILL.md "Startup 0" prose into an executable.
# Usage: init-project.sh <target-project-dir> --topology single|multi
#        [--program-id <id-for-multi>] [--triage S|M|L] [--name <project-name>] [--ci github]
#        init-project.sh <target-project-dir> --update [--topology single|multi] [--program-id <id>]
#          [--adopt-engine <reviewed-migration-manifest.json>]
#
# Creates a lean buildout baseline (idempotent — never overwrites existing files):
#   <dir>/orchestrator/{ARTIFACT_MANIFEST.yaml, DECISION_LOG.md}
#   <dir>/orchestrator/process/            (vendored deterministic checks: reconcile/orphan-scan/engines)
#   <dir>/orchestrator/process/.skill-version  (vendor stamp: skill VERSION + skill dir — drift detection)
#   <dir>/orchestrator/process/rule-bundle/ (content-pinned rules/prompts/templates, no local skill dependency)
#   <dir>/PRODUCT_VOCABULARY.md             (user-facing terminology + state-copy authority)
#   <dir>/docs/{INDEX.md,features/,journeys/,data-flows/,platform/,evidence/,archive/} (M/L module knowledge)
#   <dir>/BACKLOG.md                       (task board, project root — SessionStart hook reads it)
#   <dir>/.claude/hooks/{session-start.sh, backlog-guard.sh}
#   <dir>/.claude/settings.json            (Claude Code hook registration)
#   <dir>/.codex/hooks/{session-start.sh, backlog-guard.sh}
#   <dir>/.codex/hooks.json                (Codex hook registration)
# Then: git init if needed, DEC-000 triage record, first reconcile run (must be green).
#
# --update mode (for projects initialized with an older skill version):
#   verifies the recorded vendor baseline before touching active engine files;
#   local engine changes fail closed with a separate incoming migration candidate;
#   clean runtime files under orchestrator/process/ + core hooks are refreshed;
#   PRESERVES project-owned *.config.json / *-baseline.json / control artifacts / BACKLOG / AGENTS.md;
#   re-stamps .skill-version and runs quick read-only reconcile (never project lesson commands).
set -uo pipefail

SKILL="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="${1:-}"; shift || true
TRIAGE="M"; PNAME=""; UPDATE=0; TOPOLOGY=""; PROGRAM_ID=""; ADOPT_ENGINE=""; CI=""
while [ $# -gt 0 ]; do
  case "$1" in
    --triage) TRIAGE="${2:-M}"; shift 2;;
    --name)   PNAME="${2:-}"; shift 2;;
    --topology) TOPOLOGY="${2:-}"; shift 2;;
    --program-id) PROGRAM_ID="${2:-}"; shift 2;;
    --update) UPDATE=1; shift;;
    --adopt-engine) ADOPT_ENGINE="${2:-}"; shift 2;;
    --ci) CI="${2:-}"; shift 2;;
    *) echo "unknown arg: $1" >&2; exit 2;;
  esac
done
[ -z "$ADOPT_ENGINE" ] || [ "$UPDATE" = "1" ] || { echo "✗ --adopt-engine 只能与 --update 同用" >&2; exit 2; }
[ -n "$TARGET" ] || { echo "usage: init-project.sh <target-project-dir> --topology single|multi [--program-id <id>] [--triage S|M|L] [--name <project>] | <target-project-dir> --update" >&2; exit 2; }
case "$TRIAGE" in S|M|L) ;; *) echo "✗ --triage must be S, M or L" >&2; exit 2;; esac
case "$CI" in ""|github) ;; *) echo "✗ --ci must be github (omit to preserve the existing CI choice)" >&2; exit 2;; esac
if [ -n "$TOPOLOGY" ]; then
  case "$TOPOLOGY" in
    single) PROGRAM_REQUIRED=false ;;
    multi)
      PROGRAM_REQUIRED=true
      [ -n "$PROGRAM_ID" ] || {
        echo "✗ --topology multi 必须同时提供 --program-id" >&2
        exit 2
      }
      case "$PROGRAM_ID" in
        *[!a-zA-Z0-9._-]*|"")
          echo "✗ --program-id 只接受字母、数字、dot、underscore、hyphen" >&2
          exit 2
          ;;
      esac
      ;;
    *) echo "✗ --topology 必须是 single|multi" >&2; exit 2 ;;
  esac
fi
if [ "$UPDATE" != "1" ] && [ -z "$TOPOLOGY" ]; then
  echo "✗ 新项目必须明确 --topology single|multi；不得默认跳过跨项目完成门" >&2
  exit 2
fi
mkdir -p "$TARGET"; TARGET="$(cd "$TARGET" && pwd)"
[ -n "$PNAME" ] || PNAME="$(basename "$TARGET")"
TODAY="$(date +%F)"

is_runtime_source() {
  case "$1" in
    *.test.mjs|README.md|*/README.md|harness/semantics-test.sh) return 1 ;;
    *) return 0 ;;
  esac
}

copy_runtime_tree() {
  local source_root="$1" destination_root="$2" source_file relative_file
  mkdir -p "$destination_root"
  while IFS= read -r source_file; do
    relative_file="${source_file#"$source_root/"}"
    is_runtime_source "$relative_file" || continue
    mkdir -p "$(dirname "$destination_root/$relative_file")"
    cp -p "$source_file" "$destination_root/$relative_file"
  done < <(find "$source_root" -type f)
}

print_command() {
  node - "$@" <<'NODE'
const quote = (value) => `'${value.replaceAll("'", "'\\''")}'`;
console.log(`  ${process.argv.slice(2).map(quote).join(' ')}`);
NODE
}

# COPYFILE_EXCL reserves a unique name atomically. Repeated upgrades must never
# replace either an older backup or the latest project customization.
preserve_file() {
  node - "$1" "$2" <<'NODE'
const fs = require('node:fs');
const source = process.argv[2], base = process.argv[3];
for (let index = 0; ; index++) {
  const candidate = index ? `${base}.${index}` : base;
  try {
    fs.copyFileSync(source, candidate, fs.constants.COPYFILE_EXCL);
    console.log(candidate);
    break;
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
}
NODE
}

# CI is explicit because runtime/package-manager commands remain project-owned.
# A differing workflow becomes a candidate outside .github/workflows, so it cannot
# accidentally run as a second workflow or overwrite existing project checks.
install_ci() {
  [ "$CI" = "github" ] || return 0
  node - "$SKILL/templates/CI_VERIFY_TEMPLATE.yml" "$TARGET" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const source = fs.readFileSync(process.argv[2]);
const root = process.argv[3];
const destination = path.join(root, '.github', 'workflows', 'verify.yml');
if (!fs.existsSync(destination)) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, source, { flag: 'wx' });
  console.log('✓ .github/workflows/verify.yml 已写入；请核对项目安装/verify 命令并提交。远端 required checks 尚未验证。');
} else if (fs.readFileSync(destination).equals(source)) {
  console.log('· CI workflow 与模板相同；远端 required checks 尚未验证。');
} else {
  const hash = createHash('sha256').update(source).digest('hex').slice(0, 16);
  const candidate = path.join(root, 'orchestrator', 'ci-candidates', `verify.${hash}.yml`);
  fs.mkdirSync(path.dirname(candidate), { recursive: true });
  if (!fs.existsSync(candidate)) fs.writeFileSync(candidate, source, { flag: 'wx' });
  console.log(`! 现有 CI 保留；候选待合并、未启用: ${path.relative(root, candidate)}`);
  console.log(`  请比较 ${path.relative(root, destination)} 与候选，保留项目 verify 并合入 quick/read-only 治理步骤。`);
}
NODE
}

report_doctor() {
  # Use the current distribution's read-only inspector even when the installed
  # engine is incomplete or locally modified.
  if [ -f "$SKILL/process/project-doctor.mjs" ]; then
    node "$SKILL/process/project-doctor.mjs" --root "$TARGET" \
      || echo "! project-doctor 报告迁移问题；以上只读诊断不自动修改项目配置。" >&2
  else
    echo "· 更新包含 project-doctor 的发行版后运行只读迁移诊断："
    print_command node "$TARGET/orchestrator/process/project-doctor.mjs" --root "$TARGET"
  fi
}

print_update_command() {
  local args=(bash "$SKILL/tools/init-project.sh" "$TARGET" --update)
  [ -z "$TOPOLOGY" ] || args+=(--topology "$TOPOLOGY")
  [ -z "$PROGRAM_ID" ] || args+=(--program-id "$PROGRAM_ID")
  [ -z "$CI" ] || args+=(--ci "$CI")
  [ $# -eq 0 ] || args+=(--adopt-engine "$1")
  print_command "${args[@]}"
}

# Codex's project hook registry uses the same lifecycle names as Claude Code, but its commands
# should be absolute: Codex does not promise CLAUDE_PROJECT_DIR-style environment variables.
CODEX_HOOKS_JSON="$(TARGET="$TARGET" node - <<'NODE'
const root = process.env.TARGET;
const shellQuote = (value) => `'${value.replaceAll("'", "'\\''")}'`;
const command = (file) => `bash ${shellQuote(`${root}/.codex/hooks/${file}`)}`;
const hooks = {
  SessionStart: [{ hooks: [{ type: 'command', command: command('session-start.sh') }] }],
  PreToolUse: [{ matcher: 'Edit|Write|MultiEdit', hooks: [{ type: 'command', command: command('backlog-guard.sh') }] }],
};
process.stdout.write(`${JSON.stringify({ hooks }, null, 2)}\n`);
NODE
)"

# ---------- --update: refresh vendored engine, preserve project state ----------
if [ "$UPDATE" = "1" ]; then
  PROC="$TARGET/orchestrator/process"
  [ -d "$PROC" ] || { echo "✗ $PROC not found — run plain init first" >&2; exit 2; }
  SKV="$(cat "$SKILL/VERSION" 2>/dev/null || echo unknown)"
  OLDV="$(sed -n 's/^version=//p' "$PROC/.skill-version" 2>/dev/null | head -1)"
  echo "▶ update vendored engine → $PROC (${OLDV:-unstamped} → $SKV)"
  # Check the independently managed reading bundle before engine adoption/replacement.
  node "$SKILL/process/rule-bundle.mjs" preflight "$SKILL" "$PROC" || exit $?
  if [ -n "$ADOPT_ENGINE" ]; then
    node "$SKILL/tools/engine-vendor-guard.mjs" adopt \
      "$SKILL/process" "$PROC" "$ADOPT_ENGINE" "$SKV" || exit $?
  fi
  if ! node "$SKILL/tools/engine-vendor-guard.mjs" check "$SKILL/process" "$PROC"; then
    candidate_id="$SKV"
    case "$candidate_id" in *[!a-zA-Z0-9._-]*|"") candidate_id="unknown";; esac
    candidate="$TARGET/orchestrator/.engine-update-candidates/$candidate_id"
    if [ ! -e "$candidate" ]; then
      mkdir -p "$candidate"
      copy_runtime_tree "$SKILL/process" "$candidate/process"
      echo "! incoming engine candidate: ${candidate#"$TARGET"/}/process"
    else
      echo "! incoming engine candidate already exists and was not overwritten: ${candidate#"$TARGET"/}/process"
    fi
    node "$SKILL/tools/engine-vendor-guard.mjs" draft \
      "$SKILL/process" "$candidate/process" "$candidate/migration-manifest.json" "$SKV" || exit $?
    echo "! 审核 candidate 与 required_literals 后，将 migration-manifest.json 的 reviewed/reviewed_by 填实，再运行："
    print_update_command "$candidate/migration-manifest.json"
    echo "✗ update aborted before changing active engine, hooks, configs, or .skill-version"
    exit 3
  fi
  updated=0; kept=0
  while IFS= read -r src; do
    rel="${src#"$SKILL/process/"}"
    is_runtime_source "$rel" || continue
    dest="$PROC/$rel"
    case "$rel" in
      *.config.json|*-baseline.json)   # project-owned interface/state — never clobber
        if [ -e "$dest" ]; then kept=$((kept+1)); continue; fi ;;
    esac
    mkdir -p "$(dirname "$dest")"
    if [ -e "$dest" ] && ! cmp -s "$src" "$dest"; then
      backup="$(preserve_file "$dest" "$dest.pre-update.${OLDV:-unstamped}")" || exit $?
      echo "· engine differed — preserved: ${backup#"$TARGET"/}"
    fi
    cp "$src" "$dest"; updated=$((updated+1))
  done < <(find "$SKILL/process" -type f)
  echo "✓ engine refreshed: $updated files copied, $kept project configs/baselines preserved"
  # files in the project copy that no longer exist in the skill — left as-is, but surfaced
  while IFS= read -r f; do
    rel="${f#"$PROC/"}"
    case "$rel" in .skill-version|.vendor-manifest.json|rule-bundle/*|*.config.json|*-baseline.json|*.test.mjs|README.md|*/README.md|harness/semantics-test.sh) continue;; esac
    [ -e "$SKILL/process/$rel" ] || echo "· stale (not in skill anymore, left as-is): orchestrator/process/$rel"
  done < <(find "$PROC" -type f)
  node "$SKILL/tools/engine-vendor-guard.mjs" snapshot "$SKILL/process" "$PROC" "$SKV" || exit $?
  node "$SKILL/process/rule-bundle.mjs" install "$SKILL" "$PROC" || exit $?
  # Core hooks are refreshed with immutable numbered backups of customizations.
  for host in .claude .codex; do
    mkdir -p "$TARGET/$host/hooks"
    for h in session-start.sh backlog-guard.sh; do
      hsrc="$SKILL/templates/hooks/$h"; hdest="$TARGET/$host/hooks/$h"
      if [ -e "$hdest" ] && ! cmp -s "$hsrc" "$hdest"; then
        backup="$(preserve_file "$hdest" "$hdest.pre-update")" || exit $?
        echo "· $host/$h differed — original preserved: ${backup#"$TARGET"/}; review and merge needed custom behavior"
      fi
      cp "$hsrc" "$hdest"; chmod +x "$hdest"
    done
  done
  echo "✓ Claude Code + Codex core hooks refreshed"
  # Add only the lean core hooks without clobbering unrelated project hooks.
  # JSON5/commented settings are left untouched and receive an explicit manual-merge warning.
  SETTINGS="$TARGET/.claude/settings.json"
  if [ -e "$SETTINGS" ]; then
    if node - "$SETTINGS" <<'NODE'
const fs = require('node:fs');
const file = process.argv[2];
const value = JSON.parse(fs.readFileSync(file, 'utf8'));
if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error('settings 顶层必须是 object');
if (!value.hooks || typeof value.hooks !== 'object' || Array.isArray(value.hooks)) value.hooks = {};
const desired = {
  SessionStart: { marker: 'session-start.sh', entry: { hooks: [{ type: 'command', command: 'bash "$CLAUDE_PROJECT_DIR/.claude/hooks/session-start.sh"' }] } },
  PreToolUse: { marker: 'backlog-guard.sh', entry: { matcher: 'Edit|Write|MultiEdit', hooks: [{ type: 'command', command: 'bash "$CLAUDE_PROJECT_DIR/.claude/hooks/backlog-guard.sh"' }] } },
};
for (const [event, item] of Object.entries(desired)) {
  const current = Array.isArray(value.hooks[event]) ? value.hooks[event] : [];
  if (!current.some((entry) => JSON.stringify(entry).includes(item.marker))) current.push(item.entry);
  value.hooks[event] = current;
}
const temporary = `${file}.tmp-${process.pid}`;
fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
fs.renameSync(temporary, file);
console.log('✓ .claude/settings.json → SessionStart/PreToolUse');
NODE
    then :
    else
      echo "! .claude/settings.json 不是标准 JSON — 请手动合并 core hooks" >&2
    fi
  fi
  CODEX_SETTINGS="$TARGET/.codex/hooks.json"
  if [ -e "$CODEX_SETTINGS" ]; then
    if TARGET_ROOT="$TARGET" node - "$CODEX_SETTINGS" <<'NODE'
const fs = require('node:fs');
const file = process.argv[2];
const root = process.env.TARGET_ROOT;
const value = JSON.parse(fs.readFileSync(file, 'utf8'));
if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error('hooks.json 顶层必须是 object');
if (!value.hooks || typeof value.hooks !== 'object' || Array.isArray(value.hooks)) value.hooks = {};
const shellQuote = (value) => `'${value.replaceAll("'", "'\\''")}'`;
const command = (name) => `bash ${shellQuote(`${root}/.codex/hooks/${name}`)}`;
const generatedCommand = (value, marker) => {
  if (!value.startsWith('bash ')) return false;
  const quoted = value.slice(5);
  let argument;
  if (quoted.startsWith('"')) {
    try { argument = JSON.parse(quoted); } catch { return false; }
  } else if (quoted.startsWith("'") && quoted.endsWith("'")) {
    argument = quoted.slice(1, -1).replaceAll("'\\''", "'");
    if (shellQuote(argument) !== quoted) return false;
  }
  return typeof argument === 'string' && argument.endsWith(`/.codex/hooks/${marker}`);
};
const desired = {
  SessionStart: { marker: 'session-start.sh', entry: { hooks: [{ type: 'command', command: command('session-start.sh') }] } },
  PreToolUse: { marker: 'backlog-guard.sh', entry: { matcher: 'Edit|Write|MultiEdit', hooks: [{ type: 'command', command: command('backlog-guard.sh') }] } },
};
for (const [event, valueToAdd] of Object.entries(desired)) {
  const current = Array.isArray(value.hooks[event]) ? value.hooks[event] : [];
  let found = false;
  for (const entry of current) {
    for (const hook of Array.isArray(entry.hooks) ? entry.hooks : []) {
      if (hook.type === 'command' && typeof hook.command === 'string'
          && hook.command.includes(`/.codex/hooks/${valueToAdd.marker}`)) {
        // Only refresh commands generated by this installer. Custom wrappers
        // may contain project checks or arguments that must remain intact.
        if (generatedCommand(hook.command, valueToAdd.marker)) hook.command = valueToAdd.entry.hooks[0].command;
        found = true;
      }
    }
  }
  if (!found) current.push(valueToAdd.entry);
  value.hooks[event] = current;
}
const temporary = `${file}.tmp-${process.pid}`;
fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
fs.renameSync(temporary, file);
console.log('✓ .codex/hooks.json → SessionStart/PreToolUse');
NODE
    then :
    else
      echo "! .codex/hooks.json 不是标准 JSON — 请手动合并 Codex hooks" >&2
    fi
  else
    mkdir -p "$TARGET/.codex"
    printf '%s\n' "$CODEX_HOOKS_JSON" > "$CODEX_SETTINGS"
    echo "✓ .codex/hooks.json → SessionStart/PreToolUse"
  fi
  if [ "$TOPOLOGY" = "multi" ]; then
    bash "$SKILL/tools/init-program.sh" "$TARGET" --id "$PROGRAM_ID" --name "$PNAME" || exit $?
  elif [ "$TOPOLOGY" = "single" ]; then
    node -e '
      const fs = require("node:fs");
      const file = process.argv[1];
      const value = JSON.parse(fs.readFileSync(file, "utf8"));
      if (!value || Array.isArray(value) || typeof value !== "object") {
        throw new Error("reconcile.config.json 顶层必须是 object");
      }
      value.program_completion_required = false;
      const temporary = `${file}.tmp-${process.pid}`;
      fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
      fs.renameSync(temporary, file);
    ' "$PROC/reconcile.config.json" || {
      echo "✗ 无法记录 single topology" >&2
      exit 2
    }
    echo "✓ existing project topology=single"
  fi
  echo "✓ .skill-version → $SKV"
  install_ci || exit $?
  if ! ( cd "$TARGET" && node orchestrator/process/strict-receipts-migrate.mjs check ); then
    echo "! strict receipt migration required; inspect active tasks, then run:"
    echo "  以下示例中的 T-ID 必须替换为已明确确认的非界面任务："
    print_command node "$TARGET/orchestrator/process/strict-receipts-migrate.mjs" apply --non-ui T-ID
  fi
  if ( cd "$TARGET" && node orchestrator/process/reconcile.mjs --profile quick --read-only --concise ); then
    echo "✓ quick read-only reconcile green after update（未运行项目 lessons/完整验证）"
    UPDATE_RC=0
  else
    UPDATE_RC=$?
    echo "! reconcile non-zero after update — new guards may be surfacing REAL drift; fix forward, do NOT roll the engine back to silence it"
  fi
  report_doctor
  exit "$UPDATE_RC"
fi

put(){ # $1=src $2=dest ; copy unless dest exists
  if [ -e "$2" ]; then echo "· SKIP (exists): ${2#"$TARGET"/}"; else cp "$1" "$2" && echo "✓ ${2#"$TARGET"/}"; fi
}

echo "▶ init-project → $TARGET (triage=$TRIAGE, name=$PNAME)"

# An existing process directory is not proof that initialization finished. Verify
# before creating anything else; plain init must never advertise an unpinned or
# half-copied install as complete, nor replace project edits to repair it.
if [ -d "$TARGET/orchestrator/process" ]; then
  if node "$SKILL/tools/engine-vendor-guard.mjs" verify-installed "$SKILL/process" "$TARGET/orchestrator/process" \
      && grep -q '^rule_bundle_sha256=' "$TARGET/orchestrator/process/.skill-version" \
      && grep -q '^rule_bundle_version=' "$TARGET/orchestrator/process/.skill-version" \
      && node "$SKILL/process/rule-bundle.mjs" verify "$TARGET/orchestrator/process"; then
    :
  else
    echo "✗ existing initialization is incomplete or modified; plain init stopped without overwriting project content." >&2
    echo "! 先运行显式更新检查；若有本地改动会生成独立 candidate，审核后才可 adopt："
    print_update_command
    report_doctor
    exit 3
  fi
else
  # Catch broken source references before copying an engine into the project.
  node "$SKILL/process/rule-bundle.mjs" preflight "$SKILL" "$TARGET/orchestrator/process" || exit $?
fi

# 1) control plane under orchestrator/
mkdir -p "$TARGET/orchestrator"
put "$SKILL/templates/ARTIFACT_MANIFEST_TEMPLATE.yaml" "$TARGET/orchestrator/ARTIFACT_MANIFEST.yaml"
put "$SKILL/templates/DECISION_LOG_TEMPLATE.md"        "$TARGET/orchestrator/DECISION_LOG.md"
# stamp project name + scale class into a fresh manifest (only if we just created it)
if grep -q '<project-name>' "$TARGET/orchestrator/ARTIFACT_MANIFEST.yaml" 2>/dev/null; then
  sed -i '' -e "s/<project-name>/$PNAME/" "$TARGET/orchestrator/ARTIFACT_MANIFEST.yaml" 2>/dev/null \
    || sed -i -e "s/<project-name>/$PNAME/" "$TARGET/orchestrator/ARTIFACT_MANIFEST.yaml"
  printf '\n# Scale triage (SKILL.md 「Scale Triage」): class %s — recorded as DEC-000 in DECISION_LOG.md\nscale_class: "%s"\n' "$TRIAGE" "$TRIAGE" >> "$TARGET/orchestrator/ARTIFACT_MANIFEST.yaml"
  # stamp updated_at so the fresh init doesn't carry a placeholder-staleness WARN
  sed -i '' -e "s/updated_at: \"<date-or-run-id>\"/updated_at: \"$TODAY\"/" "$TARGET/orchestrator/ARTIFACT_MANIFEST.yaml" 2>/dev/null \
    || sed -i -e "s/updated_at: \"<date-or-run-id>\"/updated_at: \"$TODAY\"/" "$TARGET/orchestrator/ARTIFACT_MANIFEST.yaml"
  if [ "$TRIAGE" = "S" ]; then
    MANIFEST_FILE="$TARGET/orchestrator/ARTIFACT_MANIFEST.yaml" node - <<'NODE'
const fs = require('node:fs');
const file = process.env.MANIFEST_FILE;
let text = fs.readFileSync(file, 'utf8');
const start = text.indexOf('  "3-design":');
const end = text.indexOf('\n  "4-build":', start);
if (start < 0 || end < 0) throw new Error('manifest missing canonical 3-design/4-build boundary');
let block = text.slice(start, end);
block = block.replace(/\n    status: "not-started"/, '\n    status: "compact"');
block = block.replace(
  /\n    notes: ""/,
  '\n    notes: "skipped-by-DEC-000 (class S); compact DESIGN stays inside PRODUCT_SPEC.md"',
);
if (!/status: "compact"/.test(block) || !/skipped-by-DEC-000.*compact/i.test(block)) {
  throw new Error('could not compile compact S design stage');
}
text = `${text.slice(0, start)}${block}${text.slice(end)}`;
fs.writeFileSync(file, text);
NODE
  fi
fi

# 2) vendor the deterministic checks
ENGINE_CREATED=0
if [ -d "$TARGET/orchestrator/process" ]; then echo "· SKIP (exists): orchestrator/process/ (refresh via --update)"; else
  copy_runtime_tree "$SKILL/process" "$TARGET/orchestrator/process" && echo "✓ orchestrator/process/ (runtime only; maintainer tests stay in the skill)"
  printf 'version=%s\nskill_dir=%s\n' "$(cat "$SKILL/VERSION" 2>/dev/null || echo unknown)" "$SKILL" > "$TARGET/orchestrator/process/.skill-version" \
    && echo "✓ orchestrator/process/.skill-version ($(cat "$SKILL/VERSION" 2>/dev/null || echo unknown))"
  ENGINE_CREATED=1
fi
if [ "$ENGINE_CREATED" = "1" ]; then
  node "$SKILL/process/rule-bundle.mjs" install "$SKILL" "$TARGET/orchestrator/process" || exit $?
  node "$SKILL/tools/engine-vendor-guard.mjs" snapshot \
    "$SKILL/process" "$TARGET/orchestrator/process" "$(cat "$SKILL/VERSION" 2>/dev/null || echo unknown)" || exit $?
fi

# 2b) minimal live reconcile config (kills the permanent "no probes" WARN; project fills probes later)
if [ ! -e "$TARGET/orchestrator/process/reconcile.config.json" ]; then
  printf '{\n  "work_branch": "main",\n  "control_root": "orchestrator",\n  "receipt_policy": "required",\n  "delivery_phase": "buildout",\n  "program_completion_required": %s,\n  "execution_mode": "interactive",\n  "autonomy_level": "interactive",\n  "context_policy": { "mode": "adaptive", "project_packs": [] },\n  "frontend_verify_commands": {},\n  "research_verify_commands": {},\n  "probes": [ { "stage": "1-plan", "path": "PRODUCT_SPEC.md" } ]\n}\n' "$PROGRAM_REQUIRED" > "$TARGET/orchestrator/process/reconcile.config.json" && echo "✓ orchestrator/process/reconcile.config.json (buildout; strict machine receipts; adaptive context; topology=$TOPOLOGY)"
fi
if [ "$TOPOLOGY" = "multi" ]; then
  bash "$SKILL/tools/init-program.sh" "$TARGET" --id "$PROGRAM_ID" --name "$PNAME" || exit $?
fi

# 2c) project rules file (AGENTS.md) — BACKLOG header and Output Language both expect it
put "$SKILL/AGENTS_TEMPLATE.md" "$TARGET/AGENTS.md"
put "$SKILL/templates/PRODUCT_VOCABULARY_TEMPLATE.md" "$TARGET/PRODUCT_VOCABULARY.md"

# 2d) physical architecture layer (M/L only — S is single-dev, no boundary ceremony; DEC-000 covers it)
if [ "$TRIAGE" != "S" ]; then
  put "$SKILL/templates/SYSTEM_ARCHITECTURE_TEMPLATE.md" "$TARGET/orchestrator/SYSTEM_ARCHITECTURE.md"
  if [ ! -e "$TARGET/orchestrator/process/boundaries.config.json" ] && [ -e "$TARGET/orchestrator/process/boundaries.config.example.json" ]; then
    cp "$TARGET/orchestrator/process/boundaries.config.example.json" "$TARGET/orchestrator/process/boundaries.config.json" \
      && echo "✓ orchestrator/process/boundaries.config.json (edit rules to match SYSTEM_ARCHITECTURE.md)"
    ( cd "$TARGET" && node orchestrator/process/boundary-scan.mjs --update-baseline >/dev/null 2>&1 ) \
      && echo "✓ boundary-baseline.json (initial ratchet start)"
  fi
  mkdir -p "$TARGET/docs/features" "$TARGET/docs/journeys" "$TARGET/docs/data-flows" \
    "$TARGET/docs/platform" "$TARGET/docs/evidence" "$TARGET/docs/archive"
  put "$SKILL/templates/knowledge/INDEX_TEMPLATE.md" "$TARGET/docs/INDEX.md"
  MANIFEST_FILE="$TARGET/orchestrator/ARTIFACT_MANIFEST.yaml" node - <<'NODE'
const fs = require('node:fs');
const file = process.env.MANIFEST_FILE;
let text = fs.readFileSync(file, 'utf8');
if (!text.includes('path: "docs/INDEX.md"')) {
  text = text.replace(
    /(      - path: "PRODUCT_SPEC\.md"\n        role: [^\n]+\n)/,
    '$1      - path: "docs/INDEX.md"\n        role: "module-spec-index"        # M/L 模块集合入口；详情由 knowledge coverage 校验\n',
  );
  fs.writeFileSync(file, text);
}
NODE
  echo "✓ manifest PLAN → docs/INDEX.md (module-spec-index)"
  if [ ! -e "$TARGET/orchestrator/process/knowledge.config.json" ]; then
    printf '%s\n' '{' \
      '  "project_root": "../..",' \
      '  "docs_dir": "../../docs",' \
      '  "features_dir": "../../docs/features",' \
      '  "journeys_dir": "../../docs/journeys",' \
      '  "data_flows_dir": "../../docs/data-flows",' \
      '  "contract_globs": ["../../contract/src/**/*.ts"],' \
      '  "root_markdown_allowlist": ["PRODUCT_SPEC.md", "PRODUCT_VOCABULARY.md", "BACKLOG.md", "AGENTS.md", "PROJECT_CONTEXT.md", "PAGE_SPEC.md"],' \
      '  "feature_map": {}' \
      '}' > "$TARGET/orchestrator/process/knowledge.config.json"
    echo "✓ orchestrator/process/knowledge.config.json (M/L module knowledge enabled)"
  fi
fi

# 3) task board at project root
put "$SKILL/templates/BACKLOG_TEMPLATE.md" "$TARGET/BACKLOG.md"
if grep -q '<项目名>' "$TARGET/BACKLOG.md" 2>/dev/null; then
  sed -i '' -e "s/<项目名>/$PNAME/" "$TARGET/BACKLOG.md" 2>/dev/null || sed -i -e "s/<项目名>/$PNAME/" "$TARGET/BACKLOG.md"
fi

# 4) lean core hooks. Deeper observer/reconcile hooks are maintenance opt-ins.
for host in .claude .codex; do
  mkdir -p "$TARGET/$host/hooks"
  for h in session-start.sh backlog-guard.sh; do
    put "$SKILL/templates/hooks/$h" "$TARGET/$host/hooks/$h"
  done
  chmod +x "$TARGET/$host/hooks/"*.sh 2>/dev/null || true
done

# 5) settings.json — create if absent; never clobber an existing one
HOOKS_JSON='{
  "hooks": {
    "SessionStart": [ { "hooks": [ { "type": "command",
      "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/session-start.sh\"" } ] } ],
    "PreToolUse": [ { "matcher": "Edit|Write|MultiEdit",
      "hooks": [ { "type": "command",
      "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/backlog-guard.sh\"" } ] } ]
  }
}'
if [ -e "$TARGET/.claude/settings.json" ]; then
  echo "! .claude/settings.json exists — merge the hooks block manually:"
  echo "$HOOKS_JSON" | sed 's/^/    /'
else
  printf '%s\n' "$HOOKS_JSON" > "$TARGET/.claude/settings.json" && echo "✓ .claude/settings.json (SessionStart/PreToolUse)"
fi

# Codex has a project-local .codex/hooks.json registry rather than Claude's settings.json.
if [ -e "$TARGET/.codex/hooks.json" ]; then
  echo "! .codex/hooks.json exists — merge the Codex hooks block manually:"
  echo "$CODEX_HOOKS_JSON" | sed 's/^/    /'
else
  printf '%s\n' "$CODEX_HOOKS_JSON" > "$TARGET/.codex/hooks.json" && echo "✓ .codex/hooks.json (SessionStart/PreToolUse)"
fi

# 5b) optional CI integration; never overwrites an existing workflow.
install_ci || exit $?

# 6) git
if git -C "$TARGET" rev-parse --git-dir >/dev/null 2>&1; then echo "· git repo already present"; else
  git -C "$TARGET" init -q && echo "✓ git init"
fi

# 7) DEC-000: record the triage class (one DEC covers the whole class — no per-stage skip DECs)
if ! grep -q 'DEC-000' "$TARGET/orchestrator/DECISION_LOG.md" 2>/dev/null; then
  cat >> "$TARGET/orchestrator/DECISION_LOG.md" <<EOF

\`\`\`text
ID: DEC-000
Date: $TODAY
Stage: 1-plan
Type: tradeoff
Decision: Scale triage class = $TRIAGE; delivery topology = $TOPOLOGY. Constitution placeholder: PRODUCT_SPEC.md, due at 1-plan approval.
Rationale: one DEC records scale and the explicit single/multi completion topology; no default program opt-out or per-stage skip DEC.
Pattern-Ref: none(分诊规则本身即依据)
Asset-Ref: none
Source: tools/init-project.sh
Affected Artifacts: orchestrator/ARTIFACT_MANIFEST.yaml
Invalidates: none
Owner: user
Revisit Trigger: project outgrows class $TRIAGE (e.g. real users appear on an S project)
Status: active
\`\`\`
EOF
  echo "✓ DEC-000 (triage $TRIAGE + constitution placeholder)"
else
  echo "· SKIP: DEC-000 already recorded"
fi

# 7b) commit the scaffold (also materializes the work_branch so reconcile's probes can run)
if ! git -C "$TARGET" rev-parse --verify HEAD >/dev/null 2>&1; then
  git -C "$TARGET" add -A && git -C "$TARGET" commit -q -m "chore: orchestrator scaffold (init-project.sh, class $TRIAGE)" && echo "✓ scaffold committed (branch $(git -C "$TARGET" branch --show-current))"
  BR="$(git -C "$TARGET" branch --show-current)"
  if [ "$BR" != "main" ] && [ -e "$TARGET/orchestrator/process/reconcile.config.json" ]; then
    sed -i '' -e "s/\"work_branch\": \"main\"/\"work_branch\": \"$BR\"/" "$TARGET/orchestrator/process/reconcile.config.json" 2>/dev/null \
      || sed -i -e "s/\"work_branch\": \"main\"/\"work_branch\": \"$BR\"/" "$TARGET/orchestrator/process/reconcile.config.json"
  fi
fi

# 8) first reconcile — a fresh init must be green
echo "▶ first reconcile:"
( cd "$TARGET" && node orchestrator/process/reconcile.mjs --profile quick --read-only --concise ); RC=$?
if [ "$RC" -eq 0 ]; then
  echo "✓ init complete. Next: stage 1-plan (workflows/v3-1-plan.md) — PRODUCT_SPEC.md is the constitution; M/L module detail belongs under docs/features/. Class $TRIAGE path per SKILL.md 「Scale Triage」."
else
  echo "✗ reconcile exited $RC on a fresh init — fix before starting stage work." >&2
fi
report_doctor
exit "$RC"
