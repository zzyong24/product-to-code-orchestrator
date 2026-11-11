#!/usr/bin/env bash
# Explicit, fail-closed migration into L2-L4 execution. Never infers tasks or authority from DEC prose.
# Usage: migrate-autonomy.sh <project> --level L2|L3|L4 --modules <reviewed-modules-config.json>
set -euo pipefail

SKILL="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="${1:-}"; shift || true
LEVEL=""; MODULES=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --level) LEVEL="${2:-}"; shift 2 ;;
    --modules) MODULES="${2:-}"; shift 2 ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done
[ -d "$TARGET" ] || { echo "✗ project directory missing: $TARGET" >&2; exit 2; }
TARGET="$(cd "$TARGET" && pwd)"
case "$LEVEL" in L2|L3|L4) ;; *) echo "✗ --level must be L2, L3 or L4" >&2; exit 2;; esac
[ -f "$MODULES" ] || { echo "✗ --modules must name a reviewed JSON file; DEC/manifest prose is never converted" >&2; exit 2; }
MODULES="$(cd "$(dirname "$MODULES")" && pwd)/$(basename "$MODULES")"
PROC="$TARGET/orchestrator/process"; DEST="$PROC/modules.config.json"; CFG="$PROC/reconcile.config.json"
[ -f "$PROC/autonomy-guard.mjs" ] || { echo "✗ project engine lacks autonomy guard; run init-project.sh <project> --update first" >&2; exit 2; }
[ -f "$CFG" ] || { echo "✗ reconcile.config.json missing" >&2; exit 2; }

node - "$MODULES" <<'NODE'
const fs = require('node:fs'); const file = process.argv[2]; const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
const modules = Object.entries(doc.modules ?? {});
if (!modules.length) throw new Error('modules input must contain a non-empty modules object');
const byId = new Map(modules);
const validateDependency = (owner, dep) => {
  if (typeof dep !== 'string' || !dep.trim()) throw new Error(`${owner}: dependency must be a non-empty module or module:step reference`);
  const [targetId, targetStep, ...extra] = dep.split(':'); const target = byId.get(targetId);
  if (extra.length || !target) throw new Error(`${owner}: dependency ${dep} names an unknown module`);
  if (targetStep && !target.tasks.includes(targetStep)) throw new Error(`${owner}: dependency ${dep} names an unknown step`);
};
for (const [id, m] of modules) {
  if (!/^T-[0-9]+(?:[-A-Za-z0-9]*)?$/.test(id)) throw new Error(`${id}: module key must be the canonical task ID (T-...)`);
  if (!Array.isArray(m.tasks) || !m.tasks.length || m.tasks.some((x) => typeof x !== 'string' || !x)) throw new Error(`${id}: tasks must be non-empty strings`);
  if (!Array.isArray(m.depends_on)) throw new Error(`${id}: depends_on array required`);
  for (const dep of m.depends_on) validateDependency(`${id}.depends_on`, dep);
  if (m.step_depends_on != null) {
    if (!m.step_depends_on || typeof m.step_depends_on !== 'object' || Array.isArray(m.step_depends_on)) throw new Error(`${id}: step_depends_on must be an object`);
    for (const [step, deps] of Object.entries(m.step_depends_on)) {
      if (!m.tasks.includes(step)) throw new Error(`${id}: step_depends_on.${step} names an unknown step`);
      if (!Array.isArray(deps)) throw new Error(`${id}: step_depends_on.${step} must be an array`);
      for (const dep of deps) validateDependency(`${id}.step_depends_on.${step}`, dep);
    }
  }
  if (!Array.isArray(m.write_set) || !m.write_set.length) throw new Error(`${id}: write_set required`);
  for (const step of m.tasks) if (!(m.verify_commands?.[step] ?? doc.verify_commands?.[step])) throw new Error(`${id}:${step}: verify command required`);
}
NODE

if [ -e "$DEST" ] && ! cmp -s "$MODULES" "$DEST"; then
  echo "✗ modules.config.json already exists and differs; review/merge it explicitly, migration will not overwrite" >&2
  exit 2
fi
cp "$MODULES" "$DEST"
node - "$CFG" "$LEVEL" <<'NODE'
const fs = require('node:fs'); const file = process.argv[2], level = process.argv[3];
const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
doc.execution_mode = 'autonomous'; doc.autonomy_level = level;
const tmp = `${file}.tmp-${process.pid}`; fs.writeFileSync(tmp, `${JSON.stringify(doc, null, 2)}\n`, { flag: 'wx' }); fs.renameSync(tmp, file);
NODE
( cd "$TARGET" && node orchestrator/process/progress.mjs generate && node orchestrator/process/autonomy-guard.mjs audit --root "$TARGET" )
echo "✓ $LEVEL enabled with explicit task/write-set/verify queue"
echo "  inspect: node orchestrator/process/progress.mjs schedule"
echo "  claim:   node orchestrator/process/progress.mjs claim <T-id:step> --agent <id>"
