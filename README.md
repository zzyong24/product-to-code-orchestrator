# 产品到代码开发脚手架

一个面向强模型的轻量产品开发脚手架：默认帮助你尽快把产品做出来；只有风险真实出现时，才加载更深的研究、审核、追溯或发布控制。

本次官方指南审计、修改依据与运行边界见 [Astra 审计记录](decisions/astra-scaffold-audit.md)。

规则归属、读取入口与运行整改见 [脚手架审计记录](docs/scaffold-audit.zh-CN.md)。

第一次使用可先读 [日期待办实操教程：从需求到验证](docs/user-guide.zh-CN.md)，查找各层职责、文件用途与加载条件可读 [模块与文件地图](docs/skill-file-map.zh-CN.md)。

## 获取与安装

独立仓库：[zzyong24/product-to-code-orchestrator](https://github.com/zzyong24/product-to-code-orchestrator)。当前为私有仓库，需要有权访问的 GitHub 账号。

需要 Git、Node.js（建议当前 LTS）和 Bash；普通使用不需要安装 npm 依赖。Claude CLI 仅在采用 `process/harness/` 串行运行器时需要。

```bash
gh repo clone zzyong24/product-to-code-orchestrator
cd product-to-code-orchestrator
bash tools/selfcheck.sh
bash tools/init-project.sh /path/to/my-product --triage S --topology single --name MyProduct
```

若宿主需要从技能目录发现它，可把仓库 clone 到 `~/.codex/skills/product-to-code-orchestrator` 或 `~/.claude/skills/product-to-code-orchestrator`；已有同名安装时先核对来源，不覆盖现有目录。

独立仓库用于分发；维护源保留在 [moonlitclear-skills 的同名目录](https://github.com/zzyong24/moonlitclear-skills/tree/main/product-to-code-orchestrator)。修改先回维护源验证，再同步分发副本。副本不携带 `output/`、缓存、凭据或用户运行记录。本仓库暂未授予开源许可证，不代表可公开再分发。

## 默认工作方式

```text
产品目标 → 最小合同 → 结构草图 → 实现 → 聚焦测试 → 真实集成 → 验收
```

交互式闭环图见 [`docs/assets/orchestrator-loop.html`](docs/assets/orchestrator-loop.html)。图中将默认的
`buildout` 快速实现路径、稳定后用户确认的 `maintenance` 路径，以及按风险激活的并行、研究、审核和发布控制
放在同一张图里；它是当前流程的导航图，不替代项目内的 manifest、看板或可执行检查。

新项目处于 `buildout`。普通任务不要求 evidence package、review sidecar、研究卡、范围账本或多轮 reviewer。代码、测试、Git 和当前任务能恢复的事实，不再复制成常驻文档。

当产品已经形成稳定基线，用户可运行 `delivery-phase.mjs promote` 进入 `maintenance`。此后修改稳定行为或公共合同，才会按风险启用正式审核。

## 初始化

```bash
bash tools/init-project.sh <project-dir> \
  --triage S \
  --topology single \
  --name <project-name>
```

初始化只创建常用入口：

- `PRODUCT_SPEC.md`（由规划阶段形成）与 `PRODUCT_VOCABULARY.md`
- `BACKLOG.md` 与精简 `AGENTS.md`
- `orchestrator/ARTIFACT_MANIFEST.yaml`
- `orchestrator/DECISION_LOG.md`
- 项目运行所需的 `orchestrator/process/`，以及其中带版本和内容哈希的 `rule-bundle/`；不复制维护者测试和历史验证产物
- SessionStart 与编辑前看板保护两个核心钩子

模板库中的追溯、研究、范围授权、复杂度、威胁、审核、自治和发布材料仍然存在，但不会以空文件污染新项目。对应风险被检测到后再生成。

## 什么时候加深

| 事实触发器 | 增加的控制 |
|---|---|
| 重复出现但机制未知的技术失败 | 有时限的 Research-First Gate + 最小探针 |
| 修改稳定行为、公共接口或数据合同 | maintenance review |
| 新增安全攻击面或已批准威胁 | threat model + security checks |
| migration、不可逆数据动作、发布 | 更宽验证 + 用户确认 |
| L2+ 自治或跨项目业务旅程 | 结构化队列、隔离、progress/program gate |
| 新增实现复杂度或 reviewer 新增范围 | 精确绑定的 ledger/authorization |

“安全”“自治”“继续推进”等标签不会自动授权新增产品范围。

## 按需上下文

每个 BUILD 任务先运行：

```bash
node orchestrator/process/context-plan.mjs --root <project-dir> --task <T-id> --json
```

按 `read_root` 读取 `required_reads`，按项目根读取 `required_project_reads`，再读当前 spec 和相关代码。只有子 Agent 派发、并行写入或自治执行，才用 `context-compile.mjs` 生成边界明确的任务包。

`read_root` 优先指向项目自己的固定规则包。本机 skill 升级不会悄悄改变已初始化项目的规则；使用 `--update` 才更新。没有包的旧项目暂时兼容本机路径并明确提示，已有包损坏时不会回退到另一份规则。

仅在宿主允许且任务适合时派发；并行的判断依据是依赖与冲突，不是“能开多少 Agent”。只读任务可共享；写任务必须有独立工作区且 write/read/shared-resource 不冲突。主会话统一领取、验证和串行合并。

## 常用真相源

| 文件 | 职责 |
|---|---|
| `PRODUCT_SPEC.md` | 产品方向与确认范围 |
| `PRODUCT_VOCABULARY.md` | 用户可见术语和状态文案 |
| `BACKLOG.md` | 任务顺序与当前状态 |
| `orchestrator/ARTIFACT_MANIFEST.yaml` | 五阶段状态 |
| `orchestrator/DECISION_LOG.md` | 用户决策和高影响取舍 |
| `FRONTEND_VALIDATION_REPORT.md` | UI 风险触发时的真实旅程验证 |

其他文件是条件产物，不出现不代表缺失。

## 保留的底线

- No API, no UI：真实交互必须有真实操作和所有者。
- 假数据不能冒充完成；关键旅程要真实写入并读回。
- 产品方向、信息架构、数据所有权、公共合同、安全姿态、发布标准和不可逆动作超出已有授权时，需要补充确认。
- 脚手架只定义通用形状，不写入具体项目、供应商或事故常量。
- 不覆盖无关改动；不经授权不 push、不部署。

执行超时相关改动遵循[超时预算与恢复](rules/timeout-budget-rules.md)：项目自行声明最低等待值，外层覆盖全部内部预算；观察结束保留原任务ID与真实后台状态。可用 `node process/timeout-budget.mjs --input <project-budget.json>` 检查机械组合，公共调用链与实际部署证据仍由项目验证。

## 维护与验证

```bash
bash tools/selfcheck.sh
bash -n tools/init-project.sh
```

`process/*.test.mjs` 是脚手架源码测试，只在 Skill 仓运行。更新既有项目使用 `init-project.sh <project> --update`；更新器保护项目配置、历史、修改过的引擎和规则包，并报告迁移缺口。初始化与更新不自动运行项目任意 lesson shell。

在产品目录中按目的选择：

```bash
node orchestrator/process/project-doctor.mjs --json
node orchestrator/process/reconcile.mjs --profile quick --read-only --concise
node orchestrator/process/reconcile.mjs --profile full
```

第一条诊断本机规则依赖、失效入口、旧钩子和 CI 接线；第二条核对结构、收据和漂移，明确列出未跑的执行检查；第三条执行已配置的完整检查，需要项目为 lessons 声明预算并准备适当隔离。完整检查可能写统计或执行真实命令。预算、输出和迁移说明见 [过程层](process/README.md)。

采用 GitHub 时，初始化或更新可加 `--ci github`。已有 workflow 保留，差异生成候选供合并；按项目真实命令调整并在远端核实 required checks。其他 CI 可采用同样的快速治理检查和独立产品验证，不因托管方式新增产品流程。

版本见 `VERSION`，变更史见 `CHANGELOG.md`。

## Agent 项目初始化

新建 Agent 产品或更换执行内核时，CONTRACT 与 Task Zero 会按需读取 [初始化架构设计](prompts/agent-architecture-initialization.md)：先明确内核、分层、目录依赖和复用决定，再用最小真实链路验证。参考 [糯米饭与上游内核](decisions/agent-kernel-references.md)，不预设所有产品同一栈；沿用原任务和上下文机制。
