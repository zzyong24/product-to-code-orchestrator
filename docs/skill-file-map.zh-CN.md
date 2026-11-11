# 模块与文件地图：这个 skill 的每一层由谁使用

本地图对应 **3.30.0**，配合 [日期待办实操教程](./user-guide.zh-CN.md) 阅读。教程解释一次开发怎样发生；这里用于回答“这个文件负责什么、什么时候才用、应该改哪一处”。

除明确写出“产品目录”外，下表路径均相对 **skill 源码目录**。文件名与命令保留原名，便于检索。表中的例子是使用场景，不表示这些功能已在示例产品中实现。

## 一、先掌握三个目录和两条执行链

| 位置 | 存放什么 | 谁维护 | 日期待办中的例子 |
| --- | --- | --- | --- |
| skill 源码目录 | 通用说明、模板、脚本、资产和自身测试 | skill 维护者 | 修改“优先复用现有组件”的通用规则 |
| 产品目录 | 需求、任务、项目配置、产品代码和验收证据 | 开发这个产品的 Agent 与用户 | 定义截止日期可为空、实现刷新后读回 |
| 产品的 `orchestrator/process/` | 初始化时复制的运行工具、项目自有配置 | 更新器维护工具；项目维护配置 | 运行 `taskctl.mjs` 记录 T-001 状态 |

第一条链是**阅读和判断**：宿主发现技能 → 读 `SKILL.md` → 定位产品 → 查询 `context-plan.mjs` → 按路径读取当前流程及相关材料 → 结合产品事实决定怎么做。

第二条链是**执行和核对**：Agent 修改产品 → 运行产品测试 → 用任务工具记录结果 → 用 `reconcile.mjs` 核对状态、文件及已启用的检查 → 向用户交付真实结果。

`context-plan` 输出文件路径，不会替 Agent 阅读；`reconcile` 核对工程事实，不会替用户判断产品是否好用。两条链配合，才能避免“文档齐了，产品没做成”。

### 文件类型决定使用方式

| 类型 | 怎么生效 | 不能误解成什么 |
| --- | --- | --- |
| 入口 | 宿主发现或 Agent 按入口读取 | 安装之后每个文件都常驻上下文 |
| 流程、规则、检查说明 | 当前任务需要时，由 Agent 读取并应用 | Markdown 自己能拦截系统调用 |
| 模板 | 创建相关产物时参考结构 | 每个项目必须把全部模板复制一遍 |
| 脚本 | 被命令、其他脚本、钩子或 CI 调用 | 文件存在就一直在后台运行 |
| 配置 | 对应脚本读取实际配置后生效 | `.example.json` 已经代表你的项目 |
| 测试、历史、案例 | 维护、研究或复用时读取 | 普通开发任务必须全量加载 |

## 二、入口与顶层文件

| 文件 | 职责与消费者 | 什么时候查看或修改 |
| --- | --- | --- |
| [SKILL.md](../SKILL.md) | 技能主入口：目标、项目定位、事实归属、按需加载和交付底线 | 理解整个技能；只有通用入口变化才改 |
| [agents/openai.yaml](../agents/openai.yaml) | 宿主展示名、简述、默认提示及隐式调用策略 | 调整技能在支持该配置的宿主中的呈现 |
| [AGENTS_TEMPLATE.md](../AGENTS_TEMPLATE.md) | 生成产品目录 `AGENTS.md` 的简短协作入口 | 新项目初始化；已有产品入口保留自身约定 |
| [README.md](../README.md) | 安装、能力、用法和维护索引 | 初次使用或寻找入口 |
| `VERSION` | skill 发布版本；初始化记录到项目运行副本 | 比较产品正在使用哪一版工具 |
| `CHANGELOG.md` | 版本变化记录 | 升级前理解变化；不是现行规则来源 |
| [skill_registry.yaml](../skill_registry.yaml) | 外部方法的参考地址、用途与边界 | 某项任务需要借鉴外部方法时；不会自动安装或加载 |

**例如：**让所有项目都优先复用原生日期控件，应改通用实现规则；“这个待办产品的日期显示为年月日”属于产品定义，不能写进 `SKILL.md` 影响其他项目。

## 三、流程层：告诉 Agent 当前阶段要完成什么

目录：[workflows](../workflows/)。五个阶段文件按当前阶段读取，公共规则集中在一个文件。

| 文件 | 输入 → 结果 | 日期待办中的具体工作 |
| --- | --- | --- |
| `_COMMON.md` | 用户目标与现有授权 → 共同执行、提问、完成原则 | 已说明不做登录，就不反复询问登录方案 |
| `v3-1-plan.md` | 想法、已有产品 → 范围、需求与验收定义 | 写出添加、选日期、完成、刷新不丢四个验收点 |
| `v3-2-contract.md` | 需求 → 操作、数据、错误与责任约定 | 确定 `dueDate` 可为空，保存失败不能显示成功 |
| `v3-3-design.md` | 契约 → 页面结构、状态和交互 | 定义空列表、添加中、保存失败、已完成状态 |
| `v3-4-build.md` | 已就绪任务 → 可运行的真实功能与验证 | 接通日期输入、保存、读回，而非只做外观 |
| `v3-5-ship.md` | 集成结果 → 验收、交付与适用的发布证据 | 实际完成添加、刷新、标记、再次刷新旅程 |

阶段名称描述交付工作，不要求每个阶段都新建一组大文档。小项目可以内嵌必要内容；验收含义仍然要清楚。

## 四、提示层：针对某一种工作调用的操作说明

目录：[prompts](../prompts/)。这里不是第二套全局规则。当前流程或具体任务需要某个操作时才读对应提示。

| 文件 | 负责的操作 | 典型触发 |
| --- | --- | --- |
| `stage-router.md` | 判断所处阶段及下一步 | 新项目开始、恢复已有项目 |
| `project-bootstrap.md` | 初始化或接管项目的步骤 | 用户说“在这个目录开一个新项目” |
| `agent-architecture-initialization.md` | 把项目结构、职责和 Agent 工作边界建立起来 | 已有仓库结构复杂，需先明确可写区域 |
| `product-audit.md` | 检查产品意图、真实动作与数据责任是否对应 | 页面有保存按钮，却没有保存行为 |
| `change-control.md` | 评估需求变更影响，更新相应事实 | 待办从本地使用扩展为多人共享 |
| `spec-cross-audit.md` | 检查需求、契约、页面等文件是否相互矛盾 | 产品说日期可选，接口却要求必填 |
| `spec-reviewer.md` | 在适用条件下执行规格评审 | 维护阶段修改已稳定行为 |
| `spec-reviewer.schema.json` | 定义评审结果的数据格式 | 评审工具校验结构化输出；不是自然语言指令 |
| `subagent-dispatch.md` | 编写有边界、可验证的委派任务 | 已决定委派一个独立子任务 |
| `external-skill-dispatch.md` | 选择宿主实际可用的外部能力并约束交接 | 需要浏览器验证或设计能力 |
| `prelaunch-engineering-audit.md` | 交付前检查实现与运行条件 | 本地能跑，需确认真实环境也成立 |
| `engineering-retro.md` | 从已发生的工程结果提炼教训 | 相同错误重复出现，需找到可复用原因 |
| `experience-capture.md` | 记录有证据的经验输入 | 捕获一次实际失败和修复机制 |
| `asset-distill.md` | 把可复用机制整理成候选或资产 | 多个项目用到同类持久化任务队列 |
| `question-budget.md` | 兼容旧链接，转到 `_COMMON.md` | 旧项目引用此文件时跟随跳转 |
| `default-assumptions.md` | 兼容旧链接，转到 `_COMMON.md` | 不在这里维护第二份默认假设规则 |
| `completion-rules.md` | 兼容旧链接，转到 `_COMMON.md` | 不在这里维护第二份完成标准 |

后三个文件很短，是有用途的兼容入口。修改授权、提问与完成的公共约定，应修改 `workflows/_COMMON.md`。

## 五、规则层：规定事实、实现和协作的边界

目录：[rules](../rules/)。规划器按任务和项目配置选择材料，相关文件也会由流程进一步引用。

| 文件 | 负责的问题 | 示例 |
| --- | --- | --- |
| `global-rules.md` | 通用实现原则、最小增量决策阶梯、实际证据 | 先问日期选择是否必要，再查已有实现、标准库、平台、已装依赖 |
| `task-ledger-rules.md` | 看板状态、简短任务记录与归档 | T-001 的长排查过程不塞进状态单元格 |
| `orchestrator-state-machine.md` | 阶段、任务与交付控制的状态关系 | 分清“开发中”和“建设模式”两条轴 |
| `product-integrity-rules.md` | 用户动作必须对应真实行为与数据责任 | 保存成功必须能读回 |
| `ui-implementation-rules.md` | 页面实现、真实交互与验证 | 日期输入不能只是一个无效占位控件 |
| `physical-architecture-rules.md` | 代码分层、依赖方向和物理边界 | 界面层不越过约定直接修改服务内部状态 |
| `knowledge-layer-rules.md` | 业务定义、生成事实与证据的归属 | 手写业务说明和生成契约摘要分开 |
| `mock-data-rules.md` | 演示数据与真实运行数据的边界 | 演示列表不冒充已持久化的待办 |
| `observability-rules.md` | 运行失败如何定位和解释 | 保存失败能查出是校验失败还是存储失败 |
| `timeout-budget-rules.md` | 等待、重试及任务耗时预算 | 挂起测试要有结束条件，不能无限等待 |
| `parallel-collab-rules.md` | 多 Agent 写入隔离和集成 | 两个任务不能同时改同一入口却互不知情 |
| `program-orchestration-rules.md` | 多项目的依赖与共同交付 | 网页项目和独立服务必须联合验收 |
| `field-lessons.md` | 少量已提炼的通用现场教训 | 查类似故障的机制，避免搬入无关历史细节 |

## 六、检查层：怎样判断可以继续

目录：[gates](../gates/)。这些是检查标准，程序能核对的部分由 `process/` 执行；涉及体验和语义的部分仍需 Agent 结合真实证据判断。

| 文件 | 检查什么 | 在案例中会发现什么 |
| --- | --- | --- |
| `_GATE_EVIDENCE.md` | 共同证据格式、判断原则及未完成项处理 | “我觉得没问题”不等于一次测试结果 |
| `01-product-gate.md` | 产品需求、范围、验收是否明确 | 没说明刷新是否保留数据 |
| `02-architecture-boundary-gate.md` | 结构边界是否清楚且可执行 | 数据归属和实际代码路径对不上 |
| `03-scope-budget-gate.md` | 范围和实现复杂度是否有依据 | 为本地待办擅自增加账号平台 |
| `04-research-first-gate.md` | 是否应先研究机制再继续尝试 | 日期偏移反复修不好，仍在盲改格式 |
| `05-ui-gate.md` | 界面方案能否承载实际产品行为 | 没有保存失败时的反馈方式 |
| `06-page-spec-gate.md` | 页面定义是否覆盖状态、动作和数据 | 有完成按钮，却没定义完成后列表变化 |
| `08-mock-data-gate.md` | 模拟数据的用途和退出条件 | 演示数据混入真实用户列表 |
| `09-frontend-implementation-gate.md` | 前端是否接通真实动作和状态 | 点击只触发提示，没有调用保存 |
| `10-frontend-validation-gate.md` | 真实页面、旅程与可见文案的验证 | 保存后的日期显示和刷新读回不一致 |
| `12-service-contract-gate.md` | 旧路径兼容入口，指向契约完整性检查 | 不再单独维护或重复加载相同检查 |
| `13-tdd-gate.md` | 与变化相关的可执行验证 | 日期为空、存储失败是否验证过 |
| `14-integration-gate.md` | 集成与交付旅程 | 单元测试通过，整页刷新后仍丢数据 |
| `15b-contract-completeness-gate.md` | 操作、数据、错误和责任的完整性 | 没定义同名待办是否允许 |
| `consistency-gates.md` | 产物之间是否一致 | 页面、接口、需求对字段含义各说各话 |
| `lessons-injection-gate.md` | 有相关教训时检查其是否已落实 | 已知失败机制在此次实现中仍未处理 |

编号是历史标识，不代表要补齐缺失编号，也不代表每次必须从 01 运行到 15。

## 七、运行层：真正执行操作的脚本

目录：[process](../process/)。初始化把运行文件复制到产品的 `orchestrator/process/`。产品运行这些副本；skill 自身的测试文件留在 skill。

### 7.1 上下文、任务和状态

| 文件 | 读取 → 输出或动作 | 谁会用、何时用 |
| --- | --- | --- |
| `context-plan.mjs` | 阶段、任务和配置 → 必读路径及原因 | Agent 开工、恢复或切换任务时查询 |
| `context-compile.mjs` | 看板、任务绑定、步骤、验证与读写边界 → `orchestrator/context/T-xxx.md` | 委派、并行或自治前准备完整交接包 |
| `taskctl.mjs` | 看板和相关证据 → 开始、阻塞、恢复、完成及任务事件 | 正常任务状态转换入口 |
| `progress.mjs` | `modules.config.json`、提交与状态 → 模块步骤、领取、依赖、调度和进度 | 项目需要结构化步骤或自治队列时 |
| `queue.mjs` | `DECISION_LOG.md` → 待确认决定列表或解决状态 | 有真实待用户决定事项时；标记解决不能代替用户决定 |
| `state-lock.mjs` | 共享状态文件 → 互斥锁与释放 | 状态工具内部防止同时写坏控制文件 |
| `delivery-phase.mjs` | 当前交付配置 → 查询或单向进入维护模式 | 用户决定项目稳定后使用 |
| `strict-receipts-migrate.mjs` | 旧看板与旧策略 → 检查或事务式迁移 | 旧项目升级证据要求；不补造历史验收 |
| `backlog-health.mjs` | 看板 → 体积、行长和状态列健康结果 | 发现任务表变成庞大聊天记录时 |
| `backlog-compact.mjs` | 已完成任务 → `BACKLOG-archive.md` 和精简看板 | 明确归档完成记录；有只读预览方式 |

### 7.2 证据、边界和执行约束

| 文件 | 主要职责 | 具体触发 |
| --- | --- | --- |
| `reconcile.mjs` | 汇总阶段清单、Git、文件和已启用检查；报告不一致 | quick/read-only 用于控制面；full 执行项目检查，`--consolidate` 还会整理记录 |
| `lesson-runner.mjs` | 串行执行项目检查，报告耗时、预算和终止结果 | full 有可执行 lessons 时；进程清理不等于隔离沙箱 |
| `rule-bundle.mjs` | 固定项目所读规则、模板与必要参考的版本和哈希 | 初始化、受保护更新及读取计划；不受本机 skill 后续改动影响 |
| `project-doctor.mjs` | 只读输出本机依赖、旧 hook、失效引用、CI 迁移诊断 | 初始化/更新后或显式排查；不执行项目命令、不证明远端门禁已启用 |
| `frontend-validation.mjs` | 把页面验证报告、真实文案、运行命令、契约与代码范围绑定 | 界面任务提交验收证据 |
| `reviewctl.mjs` | 结构化规格评审、问题状态、有限复核与证据收据 | 适用的维护模式评审；不是新项目的必经审批 |
| `test-integrity.mjs` | 检查测试完整性策略及基线变化 | 启用对应配置后，防止删弱测试换取通过 |
| `boundary-scan.mjs` | 按配置检查依赖和物理结构边界 | 模块拆分或架构依赖发生变化 |
| `orphan-scan.mjs` | 检查已启用的编号登记与追踪关系 | 有追踪矩阵时寻找无归属需求或实现 |
| `governance-guard.mjs` | 任务与文件绑定的范围、复杂度和威胁授权检查 | 新增范围、复杂实现或触及适用风险边界 |
| `research-gate.mjs` | 管理需要研究的阻塞及恢复证据 | 同一机制问题重复尝试仍无进展 |
| `autonomy-guard.mjs` | 自治任务预检、推进监测和隔离条件 | 启动无人逐步指导的执行任务 |
| `parallel-isolation.mjs` | 核对真实工作区、读写范围和待集成结果 | 多任务并行写入前后 |
| `program-gate.mjs` | 检查跨项目旅程、部署提交和证据新鲜度 | 同一个功能需要多个项目联合交付 |
| `timeout-budget.mjs` | 校验等待和验证所使用的超时预算 | 长测试、外部调用或自治执行 |

### 7.3 知识、经验和复用

| 文件 | 读取 → 结果 | 使用边界 |
| --- | --- | --- |
| `feature-sync.mjs` | 配置指定的契约代码 → `CONTRACTS.generated.md` | 确定性提取代码事实，不代写业务含义 |
| `knowledge-drift.mjs` | 源文件哈希与生成文档 → 漂移结果 | 发现生成摘要过期，应重新生成 |
| `knowledge-coverage.mjs` | 知识层配置与文档 → 覆盖结果 | 只用于已启用知识层的项目 |
| `docs-health.mjs` | 文档结构与约定 → 健康检查 | 检查已启用文档体系，不要求制造无用途材料 |
| `run-events.mjs` | 运行事件 → `RUN_EVENTS.jsonl` 及归档 | 供经验整理等工具使用，区别于任务状态事件 |
| `lessonctl.mjs` | 教训账本与配置 → 审计或相关上下文 | 某类教训与当前变化相关时 |
| `lessons-stats.mjs` | 已有统计与检查结果 → 更新后的教训统计 | 被协调器调用的纯函数模块，不是独立扫描命令 |
| `evolution-guards.mjs` | 规则使用与生命周期记录 → 演化提醒 | 发现失效、久未使用或需要收敛的规则 |
| `anti-check.mjs` | 受控的反例设置 → 检查与清理 | 验证防护是否能抓到错误；设置与清理会修改工作区 |
| `asset-check.mjs` | 资产索引、元数据和约定 → 一致性结果 | 维护资产库；不能替代目标产品验证 |
| `assets-runner.mjs` | 资产的可移植示例 → 示例测试结果 | 检查资产样例；不证明已适配业务环境 |
| `asset-mine-local.mjs` | 本地代码与扫描配置 → 复用候选 | 可选维护工具；普通开发不必执行扫描 |

例如，日期保存错一天：先用真实输入定位问题，必要时调用研究门；修复后由产品测试验证，任务工具登记结果。只有问题揭示了可复用机制，才考虑记录教训。一次小修不需要同时运行这里全部脚本。

## 八、配置层：说明“这个项目实际启用了什么”

下表是 skill 中的**示例**。项目使用时需生成或填写同目录下去掉 `.example` 的实际配置，并按真实代码路径校准。

| 示例文件（均在 `process/`） | 控制什么 | 填错的后果 |
| --- | --- | --- |
| `reconcile.config.example.json` | 项目根、工作分支、交付模式、收据策略、检查与上下文设置 | 检查错误的分支，或误判交付阶段 |
| `modules.config.example.json` | 模块、任务、步骤、依赖、验证、读写范围与上下文包 | 调度了错误任务，或对应用不使用的代码判断完成 |
| `boundaries.config.example.json` | 代码结构、依赖边界与适用基线 | 实际违规漏检，或把合理依赖误判为越界 |
| `knowledge.config.example.json` | 功能、文档、契约源与旅程映射 | 生成摘要来自错误文件 |
| `orphan-scan.config.example.json` | 编号登记及追踪扫描范围 | 把未纳入扫描的关系误当缺失 |
| `test-integrity.config.example.json` | 测试完整性检查范围与基线 | 检查不相关测试或遗漏真实测试变化 |
| `asset-check.config.example.json` | 资产库检查约定 | 资产元数据与索引不一致 |
| `asset-mine-local.config.example.json` | 本地复用候选扫描条件 | 扫描无关目录，产生无用候选 |

`process/manifest.schema.json` 定义阶段清单结构；`process/reuse-candidate.schema.json` 定义复用候选结构。它们是数据协议，不是要求 Agent 阅读执行的提示。

**模块与任务的区别：**“待办管理”是模块；“实现刷新读回”是任务；“存储实现、界面接通、旅程验证”可以是任务或模块的执行步骤。`BACKLOG.md` 给人看任务状态，模块配置告诉程序怎样依赖、验证和调度，二者通过任务标识连接。

## 九、工具层、宿主钩子与自治适配器

### 9.1 初始化和维护工具

| 文件（均在 `tools/`） | 作用 | 例子 |
| --- | --- | --- |
| `init-project.sh` | 建立产品脚手架；`--update` 更新运行副本并保护项目自有内容 | 新建日期待办项目 |
| `init-module.sh` | 创建模块知识文件与对应目录 | 创建 `docs/features/tasks/` |
| `init-program.sh` | 初始化跨项目协调目录和配置 | 将网页与独立服务纳入共同交付 |
| `migrate-autonomy.sh` | 为既有项目迁移自治执行所需结构和配置 | 项目明确准备使用自治运行器 |
| `engine-vendor-guard.mjs` | 核对运行副本基线和本地修改 | 防止更新覆盖项目改过的引擎文件 |
| `sync-to-lab.sh` | 把维护中的 skill 同步到明确指定的实验目录 | 维护者在试验副本验证；不是产品更新入口 |
| `selfcheck.sh` | skill 自身完整性检查及回归测试 | 修改 skill 后运行，普通产品任务不重复运行 |

### 9.2 宿主钩子模板

| 文件（均在 `templates/hooks/`） | 触发后做什么 | 默认情况 |
| --- | --- | --- |
| `session-start.sh` | 会话入口提供项目状态线索 | 初始化安装到对应宿主配置 |
| `backlog-guard.sh` | 编辑前检查任务状态等入口条件 | 初始化安装；具体拦截能力取决于宿主 |
| `post-tool-observe.sh` | 已注册编辑动作改变控制文件后触发核对 | 按配置启用，不是默认常驻的万能拦截器 |
| `stop-reconcile.sh` | 会话停止时做协调检查 | 按配置启用，不意味着每次都自动执行 |

产品中的 `.claude/settings.json`、`.codex/hooks.json` 声明宿主何时调用脚本。文件存在和宿主实际执行是两件事。直接 shell 或 IDE 修改可能绕过即时钩子，后续任务检查及 CI 仍需核对。

### 9.3 `process/harness/`：可选自治运行器

| 文件 | 分工 |
| --- | --- |
| `README.md` | 适用环境、依赖、运行方式与限制 |
| `PARALLEL.md` | 宿主并行执行的接入及隔离说明 |
| `init.sh` | 准备运行器所需环境 |
| `run.sh` | 串行循环调用执行与评估环节 |
| `coding-agent.md` | 给执行 Agent 的任务说明 |
| `evaluator.md` | 第一轮评估说明 |
| `evaluator-rebuttal.md` | 后续质疑与复核说明 |
| `verify-task.sh` | 执行任务配置的实际验证 |
| `settings.autonomous.json` | Claude CLI 适配配置 |
| `risk-hook.sh` | 该适配器的操作风险检查 |
| `semantics-test.sh` | 维护者验证运行器的语义行为 |

**当前 `run.sh` 是 Claude CLI 适配器。** 在 Codex 中使用 GPT-6 Astra 阅读 skill、执行工具，并不要求运行它；也不能只改模型名就宣称它成为 Astra 运行器。宿主工具可用性和模型选择由实际环境决定。

## 十、模板层：每份文件会变成什么产物

目录：[templates](../templates/)。这是材料库，**不是待填满的清单**。产物放置以当前流程和项目约定为准；下表给出常见目标名，S 类项目可以内嵌必要内容。

### 10.1 产品、契约与界面

| 模板文件 | 典型产物及用途 | 何时需要 |
| --- | --- | --- |
| `PRODUCT_SPEC_TEMPLATE.md` | `PRODUCT_SPEC.md`：方向、范围、需求、验收 | 新建或澄清产品 |
| `PRODUCT_VOCABULARY_TEMPLATE.md` | `PRODUCT_VOCABULARY.md`：用户文案与状态叫法 | 保证页面不用内部术语解释业务 |
| `PROJECT_CONTEXT_TEMPLATE.md` | `PROJECT_CONTEXT.md`：实际环境、启动与验证命令 | 项目具备真实运行方式后 |
| `SERVICE_CONTRACT_TEMPLATE.md` | `SERVICE_CONTRACT.md`：操作、输入输出、错误及责任 | 定义存储或服务行为；小项目可内嵌 |
| `BACKEND_SPEC_TEMPLATE.md` | `BACKEND_SPEC.md`：后端实现约定 | 确有后端时 |
| `LIGHT_DOMAIN_MODEL_TEMPLATE.md` | `LIGHT_DOMAIN_MODEL.md`：实体与关系 | 领域概念复杂到需要单独解释时 |
| `BUSINESS_FLOW_TEMPLATE.md` | `BUSINESS_FLOW.md`：业务流转 | 一个动作跨多个业务步骤时 |
| `MODULE_WORKFLOW_SPEC_TEMPLATE.md` | `MODULE_WORKFLOW_SPEC.md`：模块内部执行流程 | 模块有独立的多步行为时 |
| `IA_SPEC_TEMPLATE.md` | `IA_SPEC.md`：页面和导航组织 | 多页面的信息结构需要明确时 |
| `PAGE_SPEC_TEMPLATE.md` | `PAGE_SPEC.md`：页面状态、动作和数据绑定 | 需要界面；简单项目可内嵌 |
| `UI_RULES_TEMPLATE.md` | `UI_RULES.md`：视觉与交互约定 | 多页面需保持一致时 |
| `COMPONENTS_SPEC_TEMPLATE.md` | `COMPONENTS_SPEC.md`：现有或确需复用的组件职责 | 组件确有跨场景用途时；不为日期框硬建组件层 |
| `UI_MOCK_PROMPT_TEMPLATE.md` | `UI_MOCK_PROMPT.md`：设计预览任务输入 | 需要独立生成或评审界面方案时 |
| `MOCK_DATA_SPEC_TEMPLATE.md` | `MOCK_DATA_SPEC.md`：模拟数据及使用边界 | 需要演示或受控测试数据时 |
| `HOUSE_STYLE.md` | 文档写法参考 | 创建和维护文档；不是产品业务定义 |

### 10.2 状态、验证与条件记录

| 模板文件 | 产物及用途 | 使用条件 |
| --- | --- | --- |
| `BACKLOG_TEMPLATE.md` | `BACKLOG.md`：任务、依赖、验收和状态 | 初始化创建，之后持续更新 |
| `ARTIFACT_MANIFEST_TEMPLATE.yaml` | `orchestrator/ARTIFACT_MANIFEST.yaml`：阶段与产物状态 | 初始化创建 |
| `DECISION_LOG_TEMPLATE.md` | `orchestrator/DECISION_LOG.md`：重要决定和授权事实 | 初始化创建；实际决定发生后记录 |
| `SYSTEM_ARCHITECTURE_TEMPLATE.md` | `orchestrator/SYSTEM_ARCHITECTURE.md`：结构、职责和依赖方向 | M/L 或已有复杂结构 |
| `DEFAULT_ASSUMPTIONS_TEMPLATE.md` | `DEFAULT_ASSUMPTIONS.md`：确有必要单列的项目假设 | 避免在多处重复同一个假设 |
| `TEST_PLAN_TEMPLATE.md` | `TEST_PLAN.md`：验证范围、方法和环境 | 测试安排需要独立说明时 |
| `FRONTEND_VALIDATION_REPORT_TEMPLATE.md` | `FRONTEND_VALIDATION_REPORT.md`：真实页面与旅程证据 | 界面验收 |
| `INTEGRATION_REPORT_TEMPLATE.md` | `INTEGRATION_REPORT.md`：集成验证与未解决项 | 集成交付 |
| `RELEASE_REVIEW_TEMPLATE.md` | `RELEASE_REVIEW.md`：发布相关判断和证据 | 适用的发布检查 |
| `CI_VERIFY_TEMPLATE.yml` | 常见目标 `.github/workflows/verify.yml`：持续验证配置示例 | 采用对应 CI 时按真实语言、依赖和命令改写；以实际初始化输出判断是否已安装 |
| `ID_REGISTRY_TEMPLATE.md` | `ID_REGISTRY.md`：需求、接口等标识登记 | 启用编号追踪时 |
| `TRACEABILITY_MATRIX_TEMPLATE.md` | `TRACEABILITY_MATRIX.md`：标识间对应关系 | 需要系统追踪覆盖时 |
| `CHANGE_IMPACT_TEMPLATE.md` | `CHANGE_IMPACT.md`：变更影响 | 变化跨多个契约或模块时 |
| `SCOPE_LEDGER_TEMPLATE.md` | `SCOPE_LEDGER.md`：范围记录 | 范围治理条件成立时 |
| `SCOPE_AUTHORIZATIONS_TEMPLATE.json` | `SCOPE_AUTHORIZATIONS.json`：机器可核对的授权绑定 | 实际范围授权需要程序核对时 |
| `COMPLEXITY_LEDGER_TEMPLATE.json` | `COMPLEXITY_LEDGER.json`：复杂度依据和绑定 | 复杂实现需要说明和检查时 |
| `THREAT_MODEL_TEMPLATE.json` | `THREAT_MODEL.json`：适用威胁与处理 | 任务触及对应风险时 |
| `DELIVERY_GUARD_TEMPLATE.json` | `DELIVERY_GUARD.json`：交付约束记录 | 相应交付保护启用时 |
| `TECHNICAL_RESEARCH_CARD_TEMPLATE.md` | 技术研究卡：问题、假设、证据和结论 | 触发有界研究时 |
| `LESSON_LEDGER_TEMPLATE.md` | `LESSON_LEDGER.md`：有证据的教训 | 有值得持续维护的教训时 |
| `METRICS_TEMPLATE.md` | `METRICS.md`：运行与改进指标 | 实际需要统计时；不会因模板存在而强制创建 |
| `PROGRAM_CONFIG_TEMPLATE.json` | `orchestrator/program/program.config.json`：跨项目关系 | 初始化多项目协调时 |
| `PROGRAM_JOURNEY_RECEIPT_TEMPLATE.json` | `orchestrator/program/receipt.template.json`：旅程收据起始结构 | 联合验证真实用户旅程时 |
| `PROGRAM_RELEASE_SET_TEMPLATE.json` | `orchestrator/program/release-set.json`：跨项目发布集 | 记录共同交付所用的各项目版本 |

### 10.3 模块知识文件

以下模板位于 `templates/knowledge/`。以 `docs/features/tasks/` 为例，说明同一个模块内部各文件如何分工。

| 模板文件 | 常见目标 | 内容示例 |
| --- | --- | --- |
| `INDEX_TEMPLATE.md` | 知识层索引 | 待办、账户、同步分别在哪里 |
| `FEATURE_README_TEMPLATE.md` | `README.md` | 待办模块负责什么、与其他模块如何连接 |
| `FEATURE_BUSINESS_TEMPLATE.md` | `BUSINESS.md` | 截止日期可选，完成后仍保留历史 |
| `FEATURE_UI_TEMPLATE.md` | `UI.md` | 只看未完成时，完成该项后立即从筛选结果消失 |
| `FEATURE_DATA_TEMPLATE.md` | `DATA.md` | 字段含义、所有者、保存与删除关系 |
| `DFLOW_TEMPLATE.md` | 数据流说明 | 表单 → 校验 → 存储 → 读回 → 列表 |
| `JOURNEY_FLOW_TEMPLATE.md` | 用户旅程说明 | 添加带日期的待办、刷新、完成、再次刷新 |
| `BLOCK_RECEIPT_TEMPLATE.md` | 按需保存于 `blocks/` 的执行证据 | 某次实现及验证记录，不能覆盖业务规则 |

`init-module.sh` 实际创建模块的 README、BUSINESS、UI、DATA 和 `blocks/` 目录，不会自动写出真实业务答案。`CONTRACTS.generated.md` 则由 `feature-sync.mjs` 从配置指定代码生成，不是另一份人工填写的契约。

## 十一、决策与资产：知道何时复用，也知道何时不需要

目录：[decisions](../decisions/)。此处是按问题查询的知识与资产库，不属于每轮常驻提示。

| 文件 | 职责 |
| --- | --- |
| `README.md` | 决策和复用资料入口 |
| `PATTERNS.md` | 决策模式索引 |
| `patterns/PAT-001-borrow-vs-build.md` | 判断复用现成能力还是新增实现；日期输入案例主要相关条目 |
| `patterns/PAT-002-inmemory-vs-real-db.md` | 判断内存模拟与真实持久化的适用边界 |
| `patterns/PAT-003-sync-vs-async.md` | 判断同步执行与异步任务的取舍 |
| `patterns/PAT-004-contract-first-vs-direct.md` | 判断需要先明确契约的程度 |
| `agent-architecture-initialization.md` | Agent 参与工程架构初始化的参考材料 |
| `agent-kernel-references.md` | Agent 内核设计的来源参考 |
| `astra-scaffold-audit.md` | 与模型及脚手架相关的审计材料；历史论证不替代现行入口 |
| `assets/README.md`、`assets/ASSET_INDEX.md` | 资产使用方式与索引 |
| `assets/package.json` | 资产示例的测试入口与包配置 |
| `assets/_candidates/README.md` | 候选资产的状态与维护说明 |

### 可复用模块按解决的问题查找

下列目录位于 `decisions/assets/modules/`：

| 目录 | 解决的问题 | 日期待办是否通常需要 |
| --- | --- | --- |
| `MOD-001-s3-encrypted-upload/` | 对象存储上传与加密适配 | 不需要，本例没有文件上传 |
| `MOD-002-configurable-llm-adapter/` | 可配置的模型提供方适配 | 不需要，本例产品不调用模型 |
| `MOD-003-circuit-breaker-3state/` | 远端调用的熔断状态控制 | 不需要，本例没有远端服务 |
| `MOD-004-sse-tool-call-accumulator/` | 从流式响应中累积工具调用 | 不需要，本例没有流式模型响应 |
| `MOD-005-structured-output-retry-loop/` | 结构化输出校验与重试 | 不需要，本例没有模型输出解析 |
| `MOD-006-file-persisted-task-queue/` | 文件持久化任务队列 | 不需要，本例直接完成本地操作 |
| `MOD-007-structure-aware-chunker/` | 按内容结构分块 | 不需要，本例没有长文档处理 |

每个资产的 `ENTRY.md` 解释来源、适用条件、状态和验证信息；`files/` 存实现或蓝图；`example/portable-slice.mjs` 与 `example/example.test.ts` 提供可移植样例及测试。有的资产还带集成测试，例如对象存储模块。

`assets/_candidates/` 中的 `adaptive-shrink-heal-controller/`、`ndjson-stream-dedup/`、`layered-account-scheduler-observable/` 分别涉及自适应缩减恢复、流式去重和分层账户调度。候选可能只有条目，或带待验证实现；不能因为文件存在就视为已经适配当前项目。

**复用阶梯的重点是减少无谓实现。** 对日期待办最合理的结果，可能是一个资产也不引入，直接使用原生日期输入与项目现有存储方式。

## 十二、说明、测试与历史资料放在哪里

| 路径 | 用途 | 是否进入普通产品运行 |
| --- | --- | --- |
| `docs/user-guide.zh-CN.md` | 面向使用者的贯穿案例与命令练习 | 用户或 Agent 需要讲解时读取 |
| `docs/skill-file-map.zh-CN.md` | 本文件，按模块寻找职责 | 按需查阅 |
| `docs/scaffold-audit.zh-CN.md` | 去重、加载和规则收敛的审计记录 | 理解改动依据时查阅 |
| `docs/assets/orchestrator-loop.html` | 架构与运行循环的可视化说明 | 辅助理解，不参与调度 |
| `output/` | 本地文章、插图、PDF 和排版生成脚本等内容产物 | 不参与技能发现、上下文规划或产品运行；不应当作规则入口 |
| `process/README.md` | 运行工具索引 | 查工具职责时读取 |
| `process/*.test.mjs` | 初始化、状态、验证、配置、知识、自治等机制的回归测试 | 不复制到普通产品运行副本 |
| `process/harness/semantics-test.sh` | 自治适配器行为测试 | skill 维护验证 |
| `examples/selftest-taskflow-lite/control/ID_REGISTRY.md` | 自检使用的编号登记样本 | 维护测试夹具，不是项目真实需求 |
| `examples/selftest-taskflow-lite/control/TRACEABILITY_MATRIX.md` | 自检使用的追踪关系样本 | 配合自检验证断链能被发现 |
| `CHANGELOG.md` | 历史版本变更 | 查升级记录，不能作为第二套现行规则 |

测试文件与同名实现相对应，例如 `context-plan.test.mjs` 验证读取计划，`frontend-validation.test.mjs` 验证证据绑定，`init-project.test.mjs` 验证初始化。跨文件行为由 `build-hygiene.test.mjs`、`lean-context.test.mjs`、`required-entrypoints.test.mjs` 等验证。测试是维护防线，不是给产品 Agent 增加的待办清单。

## 十三、遇到问题到底改哪里：五个完整定位例子

| 问题 | 应查的事实和实现 | 合理的修改结果 |
| --- | --- | --- |
| 用户选 10 月 8 日，刷新变成 10 月 7 日 | 产品日期含义、`SERVICE_CONTRACT.md`、实际序列化和显示代码 | 修正日期存取逻辑，增加对应验证，更新相关任务证据 |
| 两个页面对同一种状态叫法不同 | `PRODUCT_VOCABULARY.md`、实际页面文案 | 统一词表与页面文案，重新验证真实显示 |
| Agent 每次都读一大堆无关规则 | `context-plan.mjs` 输出、模块的 `context_packs`、相关流程引用 | 修正过宽的触发或重复引用，保留当前确需边界 |
| 看板完成了，模块进度却仍然待办 | `BACKLOG.md`、模块任务绑定、`orchestrator/progress.json`、任务事件 | 找到状态写入或绑定差异，通过正确工具修复并核对 |
| 更新 skill 后产品还在用旧工具 | 项目 `.skill-version`、`.vendor-manifest.json`、运行文件 | 使用初始化器的 `--update`，先处理检测到的本地修改 |

最后一个判断原则：**产品含义写在产品事实中，执行步骤写在流程中，通用边界写在规则中，机械检查写在脚本中，某个项目的开关和路径写在项目配置中。** 找到事实的负责人，才能避免同一件事在五个文件里各有一个版本。
