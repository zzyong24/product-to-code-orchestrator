#!/usr/bin/env bash
# Skill self-integrity tripwire. Run after ANY sync / edit session (see README Maintainer Note).
# Exists because the skills-manager backup sync once silently rolled back two feature sets
# (fca7b714/dc011f1e, then the whole reuse/evolution engine) — this makes the next rollback LOUD.
# Exit 0 = intact · 1 = integrity broken (list printed).
set -uo pipefail
cd "$(dirname "$0")/.."
FAIL=0
ok(){ echo "✓ $*"; }
bad(){ echo "✗ $*"; FAIL=1; }

# 1) workflow → gate wiring (the first thing the old sync ate). v3-* only; _COMMON.md's prose
# mentions the "> **Gate:**" marker and would inflate the count.
n=$(grep -l '> \*\*检查：\*\*' workflows/v3-*.md 2>/dev/null | wc -l | tr -d ' ')
[ "$n" = "5" ] && ok "v3 workflows gate links 5/5" || bad "v3 workflows gate links $n/5 (sync rollback?)"

# 2) load-bearing SKILL.md kernel + description triggers. Detailed policy belongs in
# conditional rules/gates; requiring it in this hot entry point would recreate context bloat.
for pat in '实现这个想法' '事实归属' '入口与规模' '真实交互' '模型判断' '用户文案' '语义唯一' '研究门' '通用规则' 'context-plan.mjs' '未加载' '条件材料'; do
  grep -q "$pat" SKILL.md && ok "SKILL.md: $pat" || bad "SKILL.md missing: $pat"
done
grep -q 'frontend-visible-copy/v1' process/frontend-validation.mjs \
  && ok "frontend visible-copy guard wired" || bad "frontend visible-copy guard missing"
grep -q 'INTERNAL_JARGON_PATTERNS' process/frontend-validation.mjs \
  && ok "frontend implementation-jargon guard wired" || bad "frontend implementation-jargon guard missing"
grep -q 'rules/observability-rules.md' gates/14-integration-gate.md \
  && grep -q '运行观测与问题查找' templates/SERVICE_CONTRACT_TEMPLATE.md \
  && ok "runtime observability reaches contract + SHIP" \
  || bad "runtime observability contract/SHIP wiring missing"
grep -q 'platform_execution_matrix' templates/SERVICE_CONTRACT_TEMPLATE.md \
  && grep -q 'platform_execution_matrix' templates/TEST_PLAN_TEMPLATE.md \
  && grep -q '系统命令与原生 API' prompts/prelaunch-engineering-audit.md \
  && ok "cross-platform host contract reaches templates + SHIP audit" \
  || bad "cross-platform host contract wiring missing"

# Timeout policy reaches the always-loaded core and public test/gate paths.
grep -q 'timeout-budget-rules.md' rules/global-rules.md \
  && grep -q 'timeout-budget-rules' gates/13-tdd-gate.md \
  && grep -q 'timeout-budget-rules' gates/14-integration-gate.md \
  && [ -f process/timeout-budget.mjs ] && [ -f process/timeout-budget.test.mjs ] \
  && ok "timeout budget rules reach core/TDD/integration and executable verification" \
  || bad "timeout budget policy or verification entry missing"

# 2b) 入口按 UTF-8 字节计量，避免中文被空格分词低估。
skill_words=$(wc -c < SKILL.md | tr -d ' ')
[ "$skill_words" -le 7000 ] \
  && ok "SKILL.md compact: $skill_words/7000 bytes" \
  || bad "SKILL.md bloated: $skill_words words (limit 7000 bytes; move detail to conditional rules/gates)"
agents_words=$(wc -c < AGENTS_TEMPLATE.md | tr -d ' ')
[ "$agents_words" -le 3000 ] \
  && ok "AGENTS_TEMPLATE.md compact: $agents_words/3000 bytes" \
  || bad "AGENTS_TEMPLATE.md bloated: $agents_words words (limit 3000 bytes)"
router_words=$(wc -c < prompts/stage-router.md | tr -d ' ')
[ "$router_words" -le 3000 ] \
  && ok "stage-router compact: $router_words/3000 bytes" \
  || bad "stage-router bloated: $router_words words (limit 3000 bytes)"
spec_words=$(wc -c < templates/PRODUCT_SPEC_TEMPLATE.md | tr -d ' ')
[ "$spec_words" -le 7000 ] \
  && ok "PRODUCT_SPEC template compact: $spec_words/7000 bytes" \
  || bad "PRODUCT_SPEC template bloated: $spec_words words (limit 7000 bytes)"

shared_gate_files=(
  gates/01-product-gate.md
  gates/02-architecture-boundary-gate.md
  gates/03-scope-budget-gate.md
  gates/04-research-first-gate.md
  gates/05-ui-gate.md
  gates/06-page-spec-gate.md
  gates/08-mock-data-gate.md
  gates/09-frontend-implementation-gate.md
  gates/10-frontend-validation-gate.md
  gates/12-service-contract-gate.md
  gates/13-tdd-gate.md
  gates/14-integration-gate.md
  gates/15b-contract-completeness-gate.md
  gates/consistency-gates.md
)
missing_gate_contract=0
for f in "${shared_gate_files[@]}"; do
  grep -q '_GATE_EVIDENCE.md' "$f" || missing_gate_contract=$((missing_gate_contract + 1))
done
[ "$missing_gate_contract" -eq 0 ] \
  && ok "active gates inherit one shared contract" \
  || bad "$missing_gate_contract active gates do not reference _GATE_EVIDENCE.md"

gate_boilerplate=$(grep -lE '^## (Result Format|Hard-Limit Policy)$' gates/*.md 2>/dev/null \
  | grep -v 'gates/_GATE_EVIDENCE.md' | wc -l | tr -d ' ')
[ "$gate_boilerplate" -eq 0 ] \
  && ok "gate boilerplate single-sourced" \
  || bad "$gate_boilerplate gates still copy Result Format / Hard-Limit Policy"

redirect_fail=0
for f in prompts/question-budget.md prompts/default-assumptions.md prompts/completion-rules.md; do
  lines=$(wc -l < "$f" | tr -d ' ')
  grep -q 'workflows/_COMMON.md' "$f" || redirect_fail=$((redirect_fail + 1))
  [ "$lines" -le 6 ] || redirect_fail=$((redirect_fail + 1))
done
[ "$redirect_fail" -eq 0 ] \
  && ok "common prompt compatibility paths are compact redirects" \
  || bad "common prompt copies have not converged on workflows/_COMMON.md"

frontend_report_rows=$(grep -Fc '| `FRONTEND_VALIDATION_REPORT.md` |' README.md)
[ "$frontend_report_rows" -eq 1 ] \
  && ok "README document map has no duplicate frontend report row" \
  || bad "README repeats FRONTEND_VALIDATION_REPORT row $frontend_report_rows times"

# 3) key wiring endpoints exist
for f in workflows/v3-1-plan.md workflows/v3-2-contract.md workflows/v3-3-design.md workflows/v3-4-build.md workflows/v3-5-ship.md \
         workflows/_COMMON.md templates/hooks/backlog-guard.sh templates/hooks/session-start.sh templates/hooks/post-tool-observe.sh templates/hooks/stop-reconcile.sh prompts/product-audit.md \
         prompts/spec-cross-audit.md prompts/engineering-retro.md prompts/asset-distill.md \
         process/reconcile.mjs process/orphan-scan.mjs process/queue.mjs process/harness/run.sh \
         process/governance-guard.mjs process/autonomy-guard.mjs process/research-gate.mjs process/governance-guard.test.mjs process/autonomy-guard.test.mjs process/research-gate.test.mjs process/progress.test.mjs process/migrate-autonomy.test.mjs \
         process/lessonctl.mjs process/lessonctl.test.mjs \
         process/platform-portability-guidance.test.mjs \
         process/harness/risk-hook.sh decisions/assets/ASSET_INDEX.md rules/product-integrity-rules.md rules/observability-rules.md \
         process/boundary-scan.mjs process/backlog-health.mjs process/boundaries.config.example.json \
         gates/02-architecture-boundary-gate.md rules/physical-architecture-rules.md \
         gates/03-scope-budget-gate.md gates/04-research-first-gate.md templates/SCOPE_LEDGER_TEMPLATE.md templates/PRODUCT_VOCABULARY_TEMPLATE.md templates/TECHNICAL_RESEARCH_CARD_TEMPLATE.md \
         templates/SCOPE_AUTHORIZATIONS_TEMPLATE.json templates/COMPLEXITY_LEDGER_TEMPLATE.json templates/THREAT_MODEL_TEMPLATE.json templates/DELIVERY_GUARD_TEMPLATE.json \
         templates/SYSTEM_ARCHITECTURE_TEMPLATE.md prompts/subagent-dispatch.md \
         process/taskctl.mjs process/taskctl-extension.test.mjs process/reviewctl.mjs process/frontend-validation.mjs process/state-lock.mjs \
         process/reviewctl.test.mjs process/frontend-validation.test.mjs process/state-lock.test.mjs \
         prompts/spec-reviewer.schema.json templates/FRONTEND_VALIDATION_REPORT_TEMPLATE.md \
         process/context-plan.mjs process/context-plan.test.mjs process/lean-context.test.mjs process/build-hygiene.test.mjs process/required-entrypoints.test.mjs \
         process/context-compile.mjs process/context-compile.test.mjs process/parallel-isolation.mjs process/parallel-isolation.test.mjs process/delivery-phase.mjs process/delivery-phase.test.mjs process/feature-sync.mjs \
         process/program-gate.mjs process/program-gate.test.mjs \
         process/strict-receipts-migrate.mjs process/strict-receipts-migrate.test.mjs \
         process/knowledge-drift.mjs process/knowledge-coverage.mjs process/docs-health.mjs process/docs-health.test.mjs \
         process/knowledge.config.example.json process/harness/semantics-test.sh \
         rules/knowledge-layer-rules.md rules/parallel-collab-rules.md \
         templates/knowledge/FEATURE_README_TEMPLATE.md templates/knowledge/FEATURE_BUSINESS_TEMPLATE.md \
         templates/knowledge/FEATURE_DATA_TEMPLATE.md templates/knowledge/FEATURE_UI_TEMPLATE.md \
         templates/knowledge/JOURNEY_FLOW_TEMPLATE.md templates/knowledge/DFLOW_TEMPLATE.md \
         templates/knowledge/BLOCK_RECEIPT_TEMPLATE.md templates/knowledge/INDEX_TEMPLATE.md \
         rules/program-orchestration-rules.md \
         templates/PROGRAM_CONFIG_TEMPLATE.json templates/PROGRAM_RELEASE_SET_TEMPLATE.json \
         templates/PROGRAM_JOURNEY_RECEIPT_TEMPLATE.json \
         tools/init-project.sh tools/init-module.sh tools/migrate-autonomy.sh tools/init-program.sh tools/sync-to-lab.sh tools/engine-vendor-guard.mjs \
         examples/selftest-taskflow-lite/control/ID_REGISTRY.md; do
  [ -f "$f" ] && ok "exists: $f" || bad "MISSING: $f"
done

# 4) engine wiring inside reconcile (M-type rollback tripwire)
for pat in 'lessons-stats' 'evolution-guards' 'run-events' 'asset-check' 'reviewctl' 'frontend-validation' 'governance-guard' 'autonomy-guard' 'research-gate' 'delivery phase' 'CONTROL_ROOT'; do
  grep -q "$pat" process/reconcile.mjs && ok "reconcile wires: $pat" || bad "reconcile lost wiring: $pat"
done
if grep -Eq 'lessonctl\.mjs context|ASSET_INDEX|decisions/PATTERNS|(^|[^0-9])6\.5([^0-9]|$)' prompts/stage-router.md; then
  bad "stage-router eagerly injects lessons/patterns/assets"
else
  ok "stage-router delegates to the deterministic context plan"
fi
grep -q 'context-plan.mjs' prompts/stage-router.md \
  && grep -q 'required_reads' prompts/stage-router.md \
  && ok "stage-router uses pointer-only adaptive reads" \
  || bad "stage-router lost context-plan pointer wiring"
grep -q 'PreToolUse' process/harness/settings.autonomous.json && ok "risk-hook mounted" || bad "risk-hook unmounted"
grep -q 'program_completion_required=true' workflows/v3-5-ship.md \
  && grep -q 'program-gate.mjs --execute' gates/14-integration-gate.md \
  && grep -q 'program-orchestration-rules.md' process/context-plan.mjs \
  && ok "SHIP + adaptive context + integration gate wire program completion" \
  || bad "program completion gate not wired into SHIP/context/integration"
dag_line=$(grep -n '业务.*DAG' rules/parallel-collab-rules.md | head -1 | cut -d: -f1)
write_line=$(grep -n 'write_set 推导' rules/parallel-collab-rules.md | head -1 | cut -d: -f1)
[ -n "$dag_line" ] && [ -n "$write_line" ] && [ "$dag_line" -lt "$write_line" ] \
  && ok "parallel planning orders business DAG before write_set" \
  || bad "parallel planning lost business-DAG-before-write_set ordering"
grep -q 'READ_WRITE_CONFLICT' process/parallel-isolation.mjs \
  && grep -q 'RESERVED_CONTROL_PATH' process/parallel-isolation.mjs \
  && grep -q 'STALE_BASE' process/parallel-isolation.mjs \
  && grep -q 'parallel claim requires the complete execution lease' process/progress.mjs \
  && grep -q '分支本身不隔离文件系统' rules/parallel-collab-rules.md \
  && ok "parallel isolation is adaptive, conflict-aware, and main-integrated" \
  || bad "parallel isolation/candidate/lease contract missing"
grep -q 'completion_authority' rules/product-integrity-rules.md \
  && ok "product integrity owns cross-project completion authority" \
  || bad "product integrity missing completion_authority"
if grep -q '继续兼容旧' templates/BACKLOG_TEMPLATE.md; then
  bad "BACKLOG template still promises legacy completion compatibility"
else
  ok "BACKLOG template makes legacy migration explicit"
fi

# 5) scripts parse + engine tests
for s in tools/init-project.sh tools/init-module.sh tools/migrate-autonomy.sh tools/init-program.sh tools/sync-to-lab.sh templates/hooks/backlog-guard.sh templates/hooks/session-start.sh templates/hooks/post-tool-observe.sh templates/hooks/stop-reconcile.sh process/harness/run.sh process/harness/verify-task.sh; do
  bash -n "$s" 2>/dev/null && ok "bash -n: $s" || bad "bash syntax: $s"
done
if grep -Eq 'for h in .*post-tool-observe|PostToolUse:.*post-tool-observe' tools/init-project.sh; then
  bad "fresh/update still mounts the heavy PostToolUse observer"
else
  ok "buildout omits heavy PostToolUse/Stop lifecycle hooks"
fi
grep -q 'engine-vendor-guard.mjs.*check' tools/init-project.sh \
  && grep -q 'engine-vendor-guard.mjs.*snapshot' tools/init-project.sh \
  && grep -q 'engine-vendor-guard.mjs.*adopt' tools/init-project.sh \
  && grep -q '.engine-update-candidates' tools/init-project.sh \
  && grep -q 'migration-manifest.json' tools/init-project.sh \
  && ok "engine update protects extensions and supports reviewed legacy adoption" \
  || bad "engine update lost vendor baseline / fail-closed migration wiring"
if node tools/engine-vendor-guard.mjs verify-required process >/tmp/selfcheck-required-entrypoints.out 2>&1; then
  ok "SKILL startup entrypoints are complete in the managed vendor contract"
else
  bad "required engine entrypoint contract RED (/tmp/selfcheck-required-entrypoints.out)"
fi
grep -q 'PRODUCT_VOCABULARY_TEMPLATE.md.*PRODUCT_VOCABULARY.md' tools/init-project.sh \
  && grep -q 'PRODUCT_VOCABULARY.md' AGENTS_TEMPLATE.md \
  && ok "product vocabulary authority mounted by init-project + AGENTS" \
  || bad "product vocabulary authority wiring missing"
if grep -Eq 'put .*SCOPE_AUTHORIZATIONS_TEMPLATE|cp .*COMPLEXITY_LEDGER_TEMPLATE|cp .*THREAT_MODEL_TEMPLATE|cp .*DELIVERY_GUARD_TEMPLATE' tools/init-project.sh; then
  bad "fresh/update still precreates dormant governance ledgers"
else
  ok "governance ledgers are risk-triggered, not empty init artifacts"
fi
grep -q 'MECHANISM_SIGNALS' process/governance-guard.mjs \
  && grep -q 'REUSE_CONTEXT' process/governance-guard.mjs \
  && grep -q 'entry.task_id === taskId' process/governance-guard.mjs \
  && grep -q 'entry.file_sha256 === signals.file_sha256' process/governance-guard.mjs \
  && grep -q 'projectContainedFile' process/governance-guard.mjs \
  && grep -q '产品领域里的 challenge/self-attestation' process/governance-guard.test.mjs \
  && grep -q 'task-preflight 缺 task 或 write-set' process/governance-guard.test.mjs \
  && grep -q 'formal-review 引用既有 attestation' process/progress.test.mjs \
  && ok "complexity guard distinguishes reuse vocabulary from new task-owned mechanisms" \
  || bad "complexity guard lost contextual mechanism detection or its RED regressions"
grep -q 'research-first-gate/v2' process/research-gate.mjs \
  && grep -q 'research-gate.mjs observe' gates/04-research-first-gate.md \
  && grep -q 'acceptance_criteria' templates/TECHNICAL_RESEARCH_CARD_TEMPLATE.md \
  && grep -q 'failure_family' templates/TECHNICAL_RESEARCH_CARD_TEMPLATE.md \
  && grep -q '研究门' AGENTS_TEMPLATE.md \
  && ! grep -q 'TECHNICAL_RESEARCH_CARD_TEMPLATE.md' tools/init-project.sh \
  && ok "Research-First Gate remains available without precreating research artifacts" \
  || bad "Research-First Gate wiring missing"
grep -q '"delivery_phase": "buildout"' tools/init-project.sh \
  && grep -q 'auditDeliveryPhase' process/reconcile.mjs \
  && grep -q 'auditDeliveryPhase' process/progress.mjs \
  && grep -q 'phase_review' process/harness/run.sh \
  && grep -q 'delivery-phase.mjs' AGENTS_TEMPLATE.md \
  && grep -q 'buildout.*maintenance' SKILL.md \
  && ok "delivery lifecycle defaults to fast buildout and gates formal review behind maintenance" \
  || bad "delivery lifecycle/review deferral wiring missing"
grep -q '通用规则只保留可复用边界' SKILL.md \
  && grep -q '不携带项目、供应商或历史事故常量' SKILL.md \
  && ok "global scaffold invariant rejects project-bound policy" \
  || bad "global scaffold/project-boundary invariant missing"
grep -q 'step_depends_on' process/progress.mjs \
  && grep -q 'step_depends_on' process/modules.config.example.json \
  && grep -q "execution_mode === 'autonomous'.*prevMap" process/progress.mjs \
  && grep -q 'transitionErrors(v, step, { agent' process/progress.mjs \
  && grep -q 'Intermediate progress step requires\|intermediate progress step requires' process/progress.mjs \
  && grep -q 'step_depends_on' rules/orchestrator-state-machine.md \
  && ok "multi-step queue uses step-scoped dependencies without laundering BACKLOG state" \
  || bad "multi-step queue dependency/board-state contract missing"
grep -q 'knowledge.config.json' tools/init-project.sh \
  && grep -q 'docs/features' tools/init-project.sh \
  && grep -q 'root_markdown_allowlist' process/docs-health.mjs \
  && grep -q 'tools/init-module.sh' workflows/v3-1-plan.md \
  && ok "M/L module specs + root hygiene wired" \
  || bad "module spec layout wiring missing"
vocab_missing=0
for pat in 'Connector' 'Manifest' 'Domain' 'Entity' 'Snapshot' 'Claim' 'supersede' 'canonical state' 'Read / Write' 'CRUD' 'event' 'schema' 'pipeline' 'bounded context' 'aggregate' 'service' '空状态' '确认' '拒绝' '进行中' '出错' '已保存'; do
  grep -Fq "$pat" templates/PRODUCT_VOCABULARY_TEMPLATE.md || vocab_missing=$((vocab_missing + 1))
done
[ "$vocab_missing" -eq 0 ] \
  && ok "product vocabulary template covers implementation clusters + UI state copy" \
  || bad "product vocabulary template missing $vocab_missing required terms/states"
grep -q '\.codex/hooks.json' tools/init-project.sh \
  && grep -q 'SessionStart/PreToolUse' tools/init-project.sh \
  && ok "Codex lean core hooks mounted by init-project" \
  || bad "Codex lifecycle hooks not mounted by init-project"
for s in process/reconcile.mjs process/lesson-runner.mjs process/rule-bundle.mjs process/project-doctor.mjs process/lessonctl.mjs process/orphan-scan.mjs process/progress.mjs process/boundary-scan.mjs process/research-gate.mjs process/delivery-phase.mjs process/governance-guard.mjs process/autonomy-guard.mjs \
         process/backlog-health.mjs process/taskctl.mjs process/context-plan.mjs process/context-compile.mjs process/parallel-isolation.mjs \
         process/reviewctl.mjs process/frontend-validation.mjs process/state-lock.mjs \
         process/program-gate.mjs process/strict-receipts-migrate.mjs \
         process/feature-sync.mjs process/knowledge-drift.mjs process/knowledge-coverage.mjs process/docs-health.mjs \
         tools/engine-vendor-guard.mjs; do
  node --check "$s" 2>/dev/null && ok "node --check: $s" || bad "node syntax: $s"
done
# Node 25 会等待部分跨仓 gate 测试遗留的子进程句柄；测试断言已经结束后应由 runner 收口，
# 不能让自检无限悬挂。force-exit 只影响测试 runner，不掩盖任何失败断言/非零退出。
if node --test --test-reporter=tap --test-force-exit process/*.test.mjs >/tmp/selfcheck-tests.out 2>&1; then ok "engine tests green"; else bad "engine tests RED (/tmp/selfcheck-tests.out)"; fi
node -e 'JSON.parse(require("fs").readFileSync("prompts/spec-reviewer.schema.json","utf8"))' 2>/dev/null \
  && ok "spec-reviewer schema parses" || bad "spec-reviewer schema invalid JSON"
if node -e 'for (const f of ["templates/PROGRAM_CONFIG_TEMPLATE.json","templates/PROGRAM_RELEASE_SET_TEMPLATE.json","templates/PROGRAM_JOURNEY_RECEIPT_TEMPLATE.json"]) JSON.parse(require("fs").readFileSync(f,"utf8"))' 2>/dev/null; then
  ok "program JSON templates parse"
else
  bad "program JSON template invalid"
fi
# harness fail-closed semantics (Trust Repair regression suite): silent reviewer / missing state /
# sole-writer / generate-preserves / unconfigured verify / L2 preflight — all cases must hold.
if bash process/harness/semantics-test.sh >/tmp/selfcheck-semantics.out 2>&1; then ok "harness fail-closed semantics green"; else bad "harness semantics RED (/tmp/selfcheck-semantics.out)"; fi

# 6) behavioral probes: selftest fixture must FAIL (planted break), fresh templates must PASS
node process/orphan-scan.mjs --control-dir examples/selftest-taskflow-lite/control >/dev/null 2>&1
[ $? -eq 1 ] && ok "selftest fixture: planted break detected (exit 1)" || bad "selftest fixture did not fail as designed"
T=$(mktemp -d); mkdir -p "$T/orchestrator"
cp templates/ARTIFACT_MANIFEST_TEMPLATE.yaml "$T/orchestrator/ARTIFACT_MANIFEST.yaml"
cp templates/DECISION_LOG_TEMPLATE.md "$T/orchestrator/DECISION_LOG.md"
cp templates/BACKLOG_TEMPLATE.md "$T/BACKLOG.md"
cp -R process "$T/orchestrator/process"
printf '{\n  "work_branch": "main",\n  "control_root": "orchestrator",\n  "receipt_policy": "required",\n  "delivery_phase": "buildout",\n  "program_completion_required": false,\n  "execution_mode": "interactive",\n  "autonomy_level": "interactive",\n  "context_policy": {"mode":"adaptive","project_packs":[]},\n  "frontend_verify_commands": {},\n  "probes": []\n}\n' > "$T/orchestrator/process/reconcile.config.json"
( cd "$T" && git init -q && node orchestrator/process/reconcile.mjs >/dev/null 2>&1 )
[ $? -eq 0 ] && ok "fresh-template reconcile green" || bad "fresh-template reconcile RED"
rm -rf "$T"

# 7) no dead external/ runtime refs; version consistency
if grep -rn 'source: "external/' skill_registry.yaml >/dev/null 2>&1; then bad "registry has external/ sources again"; else ok "registry pointerized"; fi
if [ -f VERSION ] && head -5 CHANGELOG.md 2>/dev/null | grep -q "$(cat VERSION)"; then ok "VERSION $(cat VERSION) matches CHANGELOG head"; else bad "VERSION/CHANGELOG mismatch or missing"; fi

# 8) evolution tripwire: uncommitted work is exactly what the backup sync eats (v3.3.0 was lost
# this way — edited, verified, never committed, then the sync overwrote the tree from an old
# snapshot with zero git residue). WARN only: mid-session dirt is normal; ending a session dirty is not.
if git rev-parse --git-dir >/dev/null 2>&1; then
  if [ -n "$(git status --porcelain . 2>/dev/null)" ]; then
    echo "! WARN: skill tree has UNCOMMITTED changes — commit before ending the session (backup sync silently overwrites uncommitted work; v3.3.0 was lost this way)."
  else
    ok "evolution tripwire: working tree fully committed"
  fi
fi

echo "──────────────────────────────"
[ "$FAIL" -eq 0 ] && echo "✓ skill integrity intact" || echo "✗ INTEGRITY BROKEN — inspect git log/status, restore the intended source, then use sync-to-lab.sh only with an explicit verified LAB_DIR"
exit "$FAIL"
