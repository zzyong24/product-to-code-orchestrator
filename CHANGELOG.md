# Changelog

本框架的成长记录。定位:**个人快速起项目的可成长、可进化脚手架**(不是社区框架——横向对比结论见知识库《AI 开发流程框架横向对比》,2026-07-02)。版本升级时同步改 `VERSION`;`tools/selfcheck.sh` 校验两者一致,作为同步回滚的绊线之一。

## 3.30.0 — 2026-10-20（规则随项目固定与检查分层）

- 项目携带带内容哈希的规则包，规划器优先读取项目固定版本；保护本地修改，旧版外部路径明确诊断，不将版本号当作迁移完成。
- 初始化与更新使用快速只读检查；新增迁移诊断和显式 `--ci github`，保留项目定制配置，已有 CI 差异生成候选，不宣称远端 required checks 已启用。
- 高频钩子改用快速审计，完整 lesson 命令采用可观测、有预算的执行器；快速结果明确覆盖缺口，不代替完整验证。文档与看板告警继续向上传递。
- 自治改动量改为本轮提交差异与工作区变化，防止提交后计数归零；看板报告符号/文字冲突，状态行数不冒充真实并发数。
- 修复中断初始化误报完成、更新覆盖历史备份、特殊路径命令引用和软链接 CLI 静默退出；会话 hook 注入与当前按需执行规则一致。

## 3.29.0 — 2026-10-08（中文规则与文档职责收敛）

- 入口、阶段检查、自动执行说明和产物模板改用中文，保留机读字段、枚举与兼容路径。
- 合并重复检索/外部能力规则；移除强制双语、固定范围额度、虚构审计节拍和只读评审写文件的冲突。
- 澄清范围授权、无人值守、建设/维护模式及 Claude 运行适配器边界；模板按真实用途填写，不生成空表。
- 补充文档归属、加载路径与维护记录；本轮依据本地 Hypit 的目标、职责和按需阅读结构。

## 3.28.0 — 2026-10-08（最小实现阶梯）

- 将必要性 → 工程复用 → 标准库 → 原生平台 → 已安装依赖 → 最小增量接入既有 core 规则、BUILD 和 worker；不新增 hook、gate 或逐级报告。
- 收窄 PAT-001 为复杂选型参考，取消资产库强制先查、未知即自研、默认包 adapter 和每次双写账本；保留许可、合同、安全及维护成本检查。
- 在 PAT-001 记录 Ponytail 一手来源、基准限制与正反情境；没有运行 Astra A/B，不宣称性能收益。

## 3.27.4 — 2026-10-06（超时预算与观察终态防复发）

- 将执行下限、由内向外预算、库默认、即时取消与原绝对deadline规则接入core及TDD/集成Gate；不同项目自行确认数值。
- 增加机械预算校验公共CLI及跨领域回归，覆盖串行重试、排队/启动/清理、无限观察和共享deadline。
- 明确页面观察结束保留原ID与真实后台状态，模拟不能替代真实运行证据。

## 3.27.3 — 2026-10-05（精确文件名的字面方括号兼容）

- `progress`和候选隔离校验支持精确仓内文件名中的字面方括号，保持字符串匹配，不展开字符类。
- 含方括号的目录`/**`仍拒绝；原通配符、穿越、保留控制文件、租约与真实Git工作树边界继续生效。
- 增加公共`generate → claim`和真实候选提交回归，覆盖动态路由、发票文件、字符类貌似的字面名称及相邻文件拒绝。

## 3.27.2 — 2026-09-14（闭环可视化与轻量流程对齐）

- 恢复 `docs/assets/orchestrator-loop.html`，并将其从旧版“默认自治 + 默认双评审”叙事更新为当前实现：Agent loop 为统一基线，`context-plan` 是交互式最小读取入口，`context-compile` 只服务派发/并行/自治。
- 图中明确 `buildout → maintenance` 单向生命周期、按需治理包、冲突感知并行与主会话唯一集成者，避免把正式审核、双评审或并行误读成所有项目的默认仪式。
- 顶部标题栏移除宣传性主标题，保留来源说明、图例、节点微文案和箭头标签，让流程细节继续可见。
- 同步恢复一份到 `Thirdspace-creator/docs/assets/orchestrator-loop.html`，保持原有可视化入口可打开；权威流程仍以本 skill 的 README、SKILL、workflow 和 executable process 为准。

## 3.27.1 — 2026-09-09（统一 Agent loop 基线）

- 按用户产品约束删除裸模型 API 作为独立架构的选项：简单任务也使用具备工具结果回注和继续/终止能力的内核，允许一轮完成，不强制调用工具。
- 同步契约入口、初始化、参考和架构模板；补充隔离验证循环及预算/取消终止的要求，避免后续迭代重建执行链路。

## 3.27.0 — 2026-09-09（Agent 初始化架构）

- 在现有 CONTRACT 和 Task Zero 按需接入 Agent 架构设计：内核选型、能力复用、分层与目录、依赖装配、最小真实链路及失败恢复验证。
- 参考糯米饭的工厂/适配器与依赖注入，补 Codex App Server、Pi、Agents SDK、LangGraph/DeepAgents 的选型依据与责任缺口；不强制统一技术栈。
- 扩展已有架构模板的条件字段，保留任务、上下文和生命周期实现；不新增阶段、Skill 拆分或常驻上下文包。实施与验证见 `decisions/agent-architecture-initialization.md`。

## 3.26.0 — 2026-09-05（Astra 官方指南审计）

- 统一已有授权、持续执行与按风险提问规则；修复 BUILD 强制 Task Packet 和入口按需路由的冲突，补齐项目上下文路径读取说明。
- 按实际收益整理代码，仅实际修改后重测；保留关键行为 RED 与真实路径验证，删除 bootstrap 造失败测试及历史事故自动扩规则要求。
- 精简派发契约、变更流程；保留写入隔离、确定性门和发布授权。明确 headless harness 的 Claude CLI 边界。
- 来源、覆盖范围、验证与未测量性能边界见 `decisions/astra-scaffold-audit.md`。

## 3.25.0 — 2026-08-26（快速实现后的即时整理 / 轻量工程卫生）

- BUILD 内循环升级为按需 RED → 最小 GREEN → 一次不超过 10 分钟的行为不变整理 → 重跑同一聚焦验证；不新增 refactor 阶段、状态、工件、台账或 reviewer，探索性 UI、纯样式、文档及无执行行为配置不再为形式制造失败测试。
- Task Packet 从既有 task binding、read/write set 与 verify command 编译无状态“五问落位”，在首次编辑前明确所有者、前后端/数据/宿主边界、Create/Modify/Test 文件、不应触碰范围和最小验证。
- UI 条件 pack 从第一条用户可见文案建立项目技术栈原生 i18n：默认语言、显式 fallback、项目声明的备用语言、key parity 与 typed-key/lint 等确定性检查；非 UI 项目不创建空语言包，也不新增人工审核。
- 命名与注释基线压进当前 BUILD 指令；删除未被加载的重复 backend TDD 规则，并把 coding-agent 从 615 words 收窄到 347 words。RED/GREEN 回归防止这些轻量习惯重新长成治理阶段或常驻手册。

## 3.24.0 — 2026-08-25（轻量默认协议 / 风险触发治理）

- fresh buildout 从十个常驻控制工件减为 `ARTIFACT_MANIFEST.yaml` + `DECISION_LOG.md`；追溯、范围授权、复杂度、威胁、研究、经验和交付账本保留为条件模板，初始化与 updater 不再预建或回填空文件，既有历史仍原样保留。
- 项目只 vendor 可执行 runtime：维护者测试、README 和 harness 语义测试留在 Skill 源仓；vendor manifest 与 updater 使用同一过滤合同。默认生命周期钩子收窄为 SessionStart + PreToolUse，不再默认安装 PostToolUse/Stop 或 GitHub CI。
- governance/reconcile 支持未激活的条件权威：没有风险信号时无需空账本；真实 `[REV-ADD]`、新复杂机制或半套追溯仍 fail-closed。first reconcile 改为有界摘要。
- SKILL 热入口从 1189 降至 662 words，项目 AGENTS 从 551 降至 223 words；README 改写为默认协议、风险触发器和最小真相源，删除过时的全流程仪式叙述。
- RED→GREEN 覆盖空治理、真实风险、runtime-only vendor、lean hooks、existing update 保留历史，以及入口硬预算；selfcheck 同步防止重型默认重新长回。

## 3.23.0 — 2026-08-24（快速铺开期 / 稳定维护期）

- fresh init 默认 `delivery_phase=buildout`：队列只铺实现与验收，不创建 formal-review 步骤、review sidecar 或多轮审核；类型检查、单测、结构边界、真实集成旅程和高影响用户确认继续有效。
- 新增 `delivery-phase.mjs`：`audit` 阻止 buildout 重新长出审核队列，`promote --decision DEC-xxx` 只允许用户在干净稳定 commit 上单向进入 `maintenance`；旧项目缺字段时保持 maintenance 兼容，不静默降级。
- autonomous harness 按生命周期执行：buildout 只跑 coder → `verify-task` → acceptance，maintenance 才启双 reviewer cadence 与 final review。`taskctl`、`progress`、`reconcile`、vendor/update 与 selfcheck 同步接线。

## 3.22.0 — 2026-08-24（自适应并行隔离 / 主会话合并队列）

- `progress.mjs batch` 从“取前 N 个”改为确定性冲突自由集：按当前 step 检查 write/write、read/write 与独占逻辑资源；writer 只返回 `auto`，再由运行时 workspace 证据选择短分支或 worktree。
- 新增 `parallel-isolation.mjs`：证明 branch/worktree 真实独立，并在合并前拒绝错分支、多 commit、旧 base、越出 write set 和控制面改动。worktree 只负责物理隔离，不再被当成语义冲突豁免。
- 主会话成为唯一控制面 writer/integrator：并行 claim 以项目状态锁写入真实 workspace、branch、同波次 base 与唯一 merge order；Task Packet 同步绑定当前 step 的 read/write/resource 边界，worker 只交一个候选 commit，`progress done` 只接受已落到 integration HEAD 且仍在边界内的提交。
- 保留轻量原则：脚手架不绑定某个 Agent 供应商或启动器；宿主没有原生并行能力、没有独立 workspace 或无法证明安全时自动串行。fresh/update vendor 合同与 selfcheck 覆盖新入口和全部 RED→GREEN 回归。

## 3.21.0 — 2026-08-24（强模型按需上下文 / 当前步骤任务事实）

- `context-plan.mjs` 输出合同升级为 `context-plan@2`，把多步骤任务收窄到当前 pending/claimed step；未来 UI 步骤不会提前加载 UI pack，
  缺少或歧义的 step 绑定 fail-closed，旧单步骤交互配置仍可确定性推导。
- 读取计划区分通用规则指针与项目权威指针：UI、安全、架构只引用项目中真实存在的当前 authority，
  不再只给空模板，也不把整份正文塞进 Task Packet。
- `context-compile.mjs` 只从当前 task binding 取得 write set 与该 step 的 verify command，并把同一步骤
  显式交给 planner；其他任务、其他步骤和框架自带项目政策不得混入 Packet。
- 强模型的交互式 BUILD 默认直接使用按需 planner；只有子代理派发、并行或自治交接才生成 Task Packet。
  RED/GREEN 固化跨任务隔离、步骤隔离、项目权威选择、缺失边界拒绝和禁止项目政策注入。

## 3.20.2 — 2026-08-24（按任务编译上下文 / S 紧凑路径 / 升级入口完整性）

- 新增确定性 `context-plan.mjs`：按阶段、任务、结构化 surface/risk 与显式增量 pack 只返回当前所需的
  路径指针；未加载 prose 绝不关闭 executable guard，旧项目缺 policy 时显式 `compat-full`。
- 高频入口减重：SKILL、router、PRODUCT_SPEC 与五阶段 workflow 均设硬预算；SessionStart 默认只注入
  一个队头任务，Stop 使用有界摘要但不减少检查，完整规则引擎继续随项目离线 vendoring。
- S 类 DESIGN 改为受 schema、DEC-000 与 reconcile 精确约束的 `compact` 物理形态，不再用
  `accepted-risk` 冒充正常分诊；M/L 模块知识和高风险能力仍按结构化事实单向加深。
- 从高频默认读取集、默认设计资产与通用失效库移除供应商、项目事故与身份常量；全局入口只定义
  可迁移的失效形状，项目术语、品牌、工具、任务号与事故证据留在项目 authority/evidence。
- 修复同版号源码演进时旧项目可能缺 `context-plan.mjs` 的完整性缺口：SKILL 启动入口现在必须进入
  vendor required set；fresh/update、migration candidate、manifest hash 与 selfcheck 共享同一硬合同。
- RED/GREEN 覆盖最小 read-set、UI/security 自动升级、非法降级字段、legacy compat、S compact、摘要告警、
  通用语料边界，以及从缺 planner 的旧项目升级且 modules/progress/review/脏业务文件逐字节不变。

## 3.20.1 — 2026-08-24（Complexity 机制声明与合同术语消歧）

- 修复 task-scoped complexity guard 把裸 `attestation/challenge/nonce`、既有合同兼容说明和明确不新增的
  文本误判成独立 evidence protocol，进而阻断合法中间 formal-review step 的问题。
- evidence protocol 改用语义窗口内的可靠多信号：明确的新机制声明，或新增意图加 owner、持久化、运行状态、
  可变操作中的至少两类；reuse/delegate/inherit/compatibility 只有在同时另建机制时才触发。
- ledger coverage 现在必须绑定当前 task 与精确文件 SHA-256；其他任务、旧 hash 或 category 级 entry 不再能
  替当前任务放行。缺 task/write-set 的 preflight 与逃逸项目根目录的 historical baseline 同样 fail-closed。
- RED/GREEN 覆盖 API 兼容委派、非项目领域 challenge/self-attestation、复用 verifier 后新增 UI 文案、
  真正的新 owner/store/state/operations，以及 BACKLOG 保持 `🔨` 的中间 formal-review 完成语义。

## 3.20.0 — 2026-08-23（多步骤任务的分阶段依赖与真实完成语义）

- `modules.config.json` 新增可选 `step_depends_on`：已声明的 step key 精确覆盖 module `depends_on`，
  未声明 key 保持旧 module 级依赖语义，允许审核先行、实施等待上游，而不拆伪任务 ID。
- autonomous `progress done` 区分中间与最终 step：每步都绑定真实 commit；中间 step 要求 canonical
  BACKLOG 行保持 `🔨`，只有最后一步要求 `✅`，并拒绝越序完成及用 `📋/⏸️/✅` 洗绿中间步骤；
  `done_signals` 在 autonomous 模式不再凭文件存在自动越过这些门。
- `schedule`、`claim`、`done` 复用同一套 step eligibility；直接 `done` 不能绕过依赖、block、历史隔离或
  governance quarantine，已领取的 step 只有匹配 `--agent` 才能消费 lease。
- 自治迁移和 preflight 校验 step 名与依赖引用；初始化模板、自检和 updater 回归确保项目自有
  `modules.config.json` 不被覆盖，旧单步骤/module 依赖、lease、block 与 task-scoped quarantine 保持兼容。
- RED 回归固化两条生产缺口：所有 step 误要求整项完成，以及 module 依赖同时阻断前置审核或放行后续实施。

## 3.19.1 — 2026-08-23（产品文档变化后的审核周期死锁修复）

- 修复一次性 `process-review-cycle` capability 已正确绑定旧 SPEC/constitution hash 后，新周期仍被旧
  constitution receipt 无条件拦截的问题。
- 只在 capability 已成功验证的 `startsNewCycle` 路径放宽旧 constitution hash；普通复审、错误 capability、
  错误变化 ID 和 nonce 重放继续 fail-closed。
- 回归测试同时覆盖“无 capability 的 constitution 漂移拒绝”和“有效 capability 成功创建新周期”。

## 3.19.0 — 2026-08-23（通用不确定性断路器 / 安全升级 / 历史债务隔离）

**生产回归**：3.18 的 Research-First Gate 把一次模型结构化输出事故的术语和指标写进通用框架；
existing updater 又可能用 generic engine 覆盖项目扩展；升级后旧任务治理债务还会全局阻断无关 ready task。

- Research Gate 升级为 v2：项目自定义 failure family，框架只定义通用触发形状；数据库、SDK、跨平台、
  模型等领域共用权威依据/本地证据/区分性实验/可证伪候选。恢复要求 `validated`、证据 hash 与项目
  allowlisted verify command 现场成功，旧 v1 fail-closed。
- fresh/update 都提供 `docs/research/` 与项目内研究卡模板；验收指标由项目定义，不再内置模型字段指标。
- vendored engine 新增精确 vendor manifest；本地扩展或 legacy 无基线时覆盖前停机，生成独立 candidate。
  显式迁移 manifest 绑定 candidate tree hash、required literals 和 reviewer，原子 adopt 前保存整引擎快照。
- 将可复用的 release identity / only-parent / detached checkout 与 task resume / block 验收失效能力上游，
  避免项目靠修改 generic core 持有通用能力。
- review lineage 与 complexity/REV-ADD/threat 历史债务按 task + event/file hash 隔离；旧债保持 quarantine，
  同 task 新增/篡改继续红，但 scheduler 可领取依赖满足且 write-set 隔离的其他任务。

## 3.18.0 — 2026-08-23（Research-First 技术阻塞断路器）

**事故**：LLM 深层字段连续发生同族契约失败时，BUILD 会自然继续加 prompt、normalizer、兼容分支和
整轮重试；真实运行昂贵，且供应商 strict JSON Schema 能力尚未验证，却没有确定性的研究入口。

- 新增条件式 Research-First Gate：同类失败第二次，或 vendor capability 未知/patch churn 时，原任务自动暂停；研究仍是 BUILD 的异常分支，不增加第六阶段。
- 新增 `research-gate.mjs observe|audit|resume`，状态继续落在 BACKLOG + append-only events；reconcile/taskctl 拦截手改状态绕门。
- 研究卡必须同时包含官方资料、当前代码证据、最小探针、至少两个候选及取舍，并限制为 ≤240 分钟、≤2 次迭代。
- 产品方向、数据归属、安全、契约或发布标准变化只能形成 Decision candidate；未取得明确用户确认不得恢复实现。
- 回归覆盖重复契约失败自动暂停、证据缺口拒绝、候选 DEC 拒绝和用户确认后受控恢复；selfcheck 执行全套行为测试。

## 3.17.0 — 2026-08-23（复审授权重放 / 范围洗白 / 自治绕过生产修复）

**事故**：通用 L2 DEC 可无限开启 review cycle，评审新增可被 scope-envelope 批量洗成用户确认；
scope budget 看不见 Swift/native app/Keychain/IPC 等纵向扩张，项目还可在缺 progress/modules 的情况下冒充 L2，
用文档与 DEC 增长替代任务完成并造成队头阻塞。

- review cycle 改为绑定 task、前序 spec/constitution hash、允许变化 ID、nonce 的一次性 capability；旧通用 DEC 历史保留但 fail-closed。
- 新增结构化 scope authorization、complexity/trust-boundary ledger 与 approved threat model；安全 blocker 不再由标签或未批准 same-UID attacker 自动生成。
- L2-L4 改为显式迁移和 executable preflight；watchdog 只认 commit + board/progress transition，并监测 review lineage、DEC/invalidation/changed-file churn。
- progress scheduler 在一个 vertical 阻断时领取其他依赖满足、write-set 可隔离的任务；只有全队列都依赖 blocker 才 HOLD。
- fresh init 与 existing `--update` 均安装新执行器/账本；回归覆盖真实 DEC-022、scope laundering、complexity blind spot、自治缺件、十轮空转与 head-of-line blocking。
- existing updater 在刷新任何有本地差异的 vendored engine 前保存带旧版本号的 `.pre-update.*` 副本，避免高度 dirty 项目的控制面修改被静默覆盖。

## 3.16.0 — 2026-08-23（多模块 Spec 默认按功能区组织）

**起因**：语义上的“单一真相源”被误读成一个物理巨型 `PRODUCT_SPEC.md`；拆出的 Domain/Slice/专题
Spec 与相邻 review 又继续堆在项目根目录，模块越多越难导航。

- S 保持单一轻量总纲；M/L 初始化默认创建 `docs/features`、`journeys`、`data-flows`、`platform` 等分区并启用知识层。
- `PRODUCT_SPEC.md` 改为产品宪法与模块地图；模块局部 BUSINESS/DATA/UI 进入功能目录，跨模块流程与平台横切能力各有唯一落点。
- 新增 `tools/init-module.sh`，一次生成模块四件套并登记 INDEX/knowledge config；`docs-health --strict` 拦截根目录散落的模块/专题 Spec 和执行计划。
- PLAN workflow、Product Gate、Authority Map、AGENTS 与 cross-audit 同步接线；自动测试覆盖初始化、模块登记与根目录卫生。

## 3.15.0 — 2026-08-23（独立用户语言翻译层）

**起因**：`PRODUCT_SPEC.md` 同时承载产品真相与工程语义，界面和 Agent 文案容易直接复用
`Connector / Entity / canonical state / CRUD` 等实现词；原有实现术语扫描只能拦住少数高置信词，
也没有告诉写作者应该改成哪个产品领域词。

- 新增 `PRODUCT_VOCABULARY.md` 模板：SPEC 继续独占产品含义、范围和稳定 ID，词表独占用户可见叫法；
  按接入、推进、业务对象、信息版本、生效替换、用户动作分簇，并明确模糊词按“用户是否会在真实工作中使用”判断。
- 新项目初始化即复制该文件，`AGENTS.md` 与 SKILL Authority Map 同时引用；Non-Negotiable Invariants
  明确产品领域专业词保留、软件实现词隐藏或翻译，自动扫描通过只算底线。
- 模板提供空状态、确认、拒绝、进行中、出错、已保存六类固定句式；selfcheck 覆盖模板存在、init 接线、
  必要术语与状态文案，防止后续同步把翻译层静默回滚。

## 3.14.0 — 2026-08-19（Codex 项目级 hooks 闭环）

**起因**：3.13.0 只把 Harness 式阶段落在 Claude Code 的 `.claude/settings.json`，Codex 项目没有被
`init-project.sh` 注册；这会让“SessionStart 注入、PreToolUse 门禁、PostToolUse 观察、Stop 收口”在 Codex
里变成文档承诺而不是实际机制。

- 初始化与 `--update` 同时安装 Claude Code `.claude/` 与 Codex `.codex/` hook 文件。
- 生成/补齐 Codex `.codex/hooks.json`，注册 `SessionStart`、`PreToolUse`、`PostToolUse`、`Stop` 四个阶段；命令使用绝对项目路径，不依赖 Claude 专属环境变量。
- 新增 `stop-reconcile.sh`，让 Stop 阶段真正执行最终 reconcile；保留 taskctl/CI 作为状态与绕过写入的后备权威。
- selfcheck 与 init-project 回归测试覆盖 Codex 注册、旧项目更新和 Stop 收口。

## 3.13.0 — 2026-08-15（Harness 式执行阶段 + 事件日志 fail-closed）

**起因**：对照 DeepSeek Harness 的工具执行管线后，现有脚手架虽然有前置门禁和 Stop 收口，但缺少
工具调用后的控制面观察；`RUN_EVENTS.jsonl` 也会把损坏行留到 reconcile 才以无上下文的 JSON 异常失败。

- 初始化项目新增 `PostToolUse` observer：控制面文件编辑后立即提示 reconcile 漂移；明确声明它不能撤销工具调用，最终收口仍归 Stop/reconcile。
- `RUN_EVENTS.jsonl` 增加 `run-event/v1` schema、`kind/runId` 身份校验、逐行诊断和归档游标边界检查；未知事件种类仍交给 evolution guards 处理，不另造事件权威。
- selfcheck 与 init-project 回归测试覆盖 hook 安装、事件损坏和越界游标，保持 Harness 的“阶段分离、事件可追溯、失败即停”原则。

## 3.12.0 — 2026-08-12（跨平台宿主契约 + 安装物闭环）

**起因**：Windows 用户在素材中心打开一个真实存在的文件时，产品连续 7 次执行 macOS 的
`open -R` 并报 `ENOENT`；更早的上线审计已经指出 Finder 文案残留，但发现没有变成任务、红测和
发布门卫。同期项目还出现过渠道构建只覆盖外层身份、reflink API 成功却没有真实节省磁盘、改稿
重试复用旧 attempt，证明这些不是单点笔误，而是工程契约缺口。

- 将 OS 集成固定为 command/API、shell-free argv/path、completion semantics、user copy 四轴矩阵；
  SERVICE/TEST 模板、TDD/Integration Gate 和 prelaunch audit 同步接线，要求每个支持 OS 与最终安装物证据。
- 将渠道/品牌覆盖收敛为 immutable build manifest，将本机能力收敛为目标宿主/文件系统物理效果，
  将异步任务收敛为 immutable input version + attempt identity。
- 用真实生产失败作为 RED，新增结构回归测试并纳入 selfcheck；只沉淀跨项目规则，不携带项目品牌或业务细节。

## 3.11.0 — 2026-08-07（运行日志标配 + 用户语言机械门禁）

**起因**：真实 Growth 报障只有页面 `Trace ID`，生产日志却只打印事件名，无法按编号反查；同时页面
会把机器错误码、`provider/schema/enum` 等实现术语直接交给用户。现有脚手架有可支持性提示和内部
编号扫描，但没有强制每个运行入口启用结构化日志，也没有机械拦截无编号的工程暗号。

- 新增 `rules/observability-rules.md`：API、worker、队列和定时任务统一要求服务端参考编号、结构化
  完成/失败事件、OpenTelemetry 关联、字段 allowlist、秘密/个人信息禁入、保留与访问控制。
- PRODUCT/SERVICE/TEST 模板补齐日志合同；SHIP integration gate 必须用安全生产失败完成“响应参考
  编号 → 唯一日志事件”反查，formatter 单测或一行事件名不能冒充可用。
- UI/PAGE 规则将错误文案固定为“发生了什么 → 是否受影响 → 下一步”，诊断值只称“参考编号”；
  `frontend-validation.mjs` 在真实可见文案中同时拒绝控制编号、机器错误码和高置信实现术语。
- 先用 Growth 线上故障和新增回归获得 RED，再接入规则、模板、验证器与 selfcheck；不另造第二套
  日志平台，也不把日志内容或真实秘密写入脚手架。

## 3.10.0 — 2026-08-06（工程教训闭环：失败不再丢，旧账本不再假绿）

**起因**：项目已经持续记录 `LESSON_LEDGER`，但最近教训没有稳定进入后续任务。审计发现三处
断链：`eval_red` 只写 `RUN_EVENTS`、没有消费端；consolidate 先过滤复用事件再按过滤数量归档
原始流，前置失败事件会被错位归档；项目旧 `active/promoted` 生命周期与新模板
`observation/candidate/rule` 不一致，而 selfcheck 只查文件存在，仍会假绿。

- **完整事件流一次分流**：`eval_red` 幂等写入 `LESSON_INBOX.jsonl` 的 observation，复用事件
  写入 `REUSE_OUTBOX.jsonl`，全部成功后才按原始总行数归档；自动采集永不越权晋升 rule。
- **确定性阶段注入**：新增 `lessonctl audit|context`。阶段路由只注入 candidate、已接同 ID
  可执行守卫的 rule；旧 active/promoted 仅在守卫完全匹配时临时兼容，并持续提示迁移。
- **脚手架与自检补齐**：新项目和升级项目都会获得教训账本；selfcheck 校验 CLI、路由接线、
  生命周期测试和语法，防止备份同步再次吞掉这条闭环。

## 3.9.0 — 2026-07-30（多项目父旅程完成权 + legacy 验收门封口）

**起因**：Growth、Activity、CreatorOS 分别有项目级规格、任务和测试，但三个项目都绿仍不能证明
“官方创建产品 → 代理采购 → 客户领取 → Activity 激活 → CreatorOS 消费配置”属于同一组线上
部署；并行规则按文件 `write_set` 分 lane，跨仓文件天然不相交，容易把有业务先后的步骤误判成
独立任务。与此同时，旧 Growth 配置缺 `receipt_policy`、看板缺“验收”列，实际 `taskctl` 可以
用普通截图/测试文字完成 UI 任务。三组无修改压力测试确认：规则文字会建议 `NO-GO`，机械工具
却没有能力强制它；随后 10 个 RED 用例得到 0/10。

- **薄的 program 控制面**：新增 `tools/init-program.sh`、三份 JSON 模板和
  `rules/program-orchestration-rules.md`。不新增 `PROGRAM_SPEC`、`PROGRAM_BACKLOG` 或可手改父
  状态；`docs/journeys/FLOW-*` 继续拥有业务语义，program config 只保存组件、稳定 step ID、
  `depends_on`、FLOW hash 与真实验证命令。
- **`program-gate.mjs` 成为唯一跨项目完成权**：release set 固定每个参与仓库的实际 deployed
  commit/URL；receipt 覆盖全部非 fixture 步骤和写后读/稳定/刷新/重放后置条件；`--execute`
  按依赖拓扑运行跨仓命令并原子写 execution。配置、FLOW、release、receipt 或 evidence 任一
  漂移使旧 GO 失效；失败先覆盖旧 PASS。执行回执只保存命令/输出 SHA 与字节数，不落
  command/stdout/stderr 原文。独立代码审计随后封住 execution 手工伪造、本地未部署代码替线上
  commit 洗绿、删除 program config 跳门和 executions symlink 越界：SHIP audit 会在 deployed
  commit 临时检出中 fresh rerun，失败会覆盖旧 PASS；`program_completion_required` 作为持久
  绊线。新项目初始化必须显式选择 `single|multi`，multi 当场建立控制面，`accepted-risk` 也
  不能绕开 program GO；五个 canonical stage ID 亦为强制 enforcement keys，重命名
  `5-ship` 不能把发布终态移出门禁视野。
- **业务依赖先于代码并行**：跨项目先求 `depends_on` DAG 的 ready set，`write_set` 只在同一
  ready set 内判 lane；仓库子任务只能宣布实现完成，不能把局部 PASS 提升为产品 PASS。
- **legacy fail-closed + 显式迁移**：缺失或显式 `legacy` policy 的项目可读、可 block，但不能
  `start/complete`，`reconcile` 返回非零。`strict-receipts-migrate.mjs check|apply` 以可恢复
  transaction 补
  审核/验收列并保留项目配置；活动任务默认 `待验`，只有显式 `--non-ui` ID 为 `—`，不猜任务
  类型、不伪造历史 receipt；进程若在双文件提交中断，下次调用先按 journal 恢复一致状态。
  `init-project --update` 只提示迁移，不自动洗绿。strict UI 事件账只保存命令输出 hash/bytes，
  不再持久化 output tail。
- **RED→GREEN→REFACTOR**：基线捕获“legacy 可绕过”和“规范有门、物理无门”；新增多仓缺
  execution、少组件、旧 release、漏步骤、失败沿用旧绿、输出泄密、本地 HEAD/部署 commit
  解耦、依赖抢跑/环、FLOW 漂移、SHIP reconcile、init 幂等等回归。刻意不做新任务账、新
  program spec、独立 wave 工具或让 program gate 替代各仓测试。

## 3.8.0 — 2026-07-28（脚手架减法：入口瘦身 + Gate 单一真值）

**起因**：机制持续从真实事故中增长是对的，但同一条教训被同时写进 `SKILL.md`、Gate 通用段、
workflow common 和兼容 prompt，导致每次调用都加载 4621 词入口，13 个 Gate 重复 Use/Evidence/
Hard-Limit/Result 套壳。文件数量本身不是病：资产库、栈适配模板和独立验证器各有职责；真正的病
是“同一规则多个权威”，既耗上下文又会漂移。

- **`SKILL.md` 改成路由层**：保留 Agent-Native 意图路由、authority map、11 条不变量、S/M/L、
  五阶段门图、审核收敛、产品完整性与 enforcement 边界；详细机制回指已有 rules/gates/prompts。
  4621 → 1679 词（-64%），frontmatter description 同时改回纯触发条件，不再摘要整套流程。
- **Gate 公共合同合并**：`gates/_GATE_EVIDENCE.md` 统一 when/status/evidence/硬检查优先级/
  anti-laundering/breadth/default result；13 个活跃 Gate 显式继承，只保留 checks、专属证据及
  override。Gate 总行数 717 → 522（-195）；scope-budget 的特殊状态和 architecture ratchet
  继续留在各自文件，没有为了整齐抹掉差异。
- **兼容入口去重**：`question-budget.md`、`default-assumptions.md`、`completion-rules.md`
  变成 4 行 redirect，完整规则合入 `workflows/_COMMON.md`；旧链接继续可用。
- **防再次膨胀的回归**：`selfcheck.sh` 新增入口 2600 词预算、活跃 Gate 共享合同引用、通用
  Gate 套壳零复制、兼容 prompt redirect 与 README 文档表去重检查。先在旧结构上得到 5 项 RED，
  合并后全绿。
- **刻意不合并**：五个 stage workflow（已是清晰执行边界）、各 Gate 的专属判断、process
  确定性工具、不同规模/技术栈模板、`decisions/assets` 数据库和 CHANGELOG 历史。合并这些会把
  真正不同的职责塞成巨型文件，数字更小但认知更差。

## 3.7.1 — 2026-07-28（用户文案去控制面编号）

**起因**：生成页面会把用于规格追踪的 `T106` / `T-106` / `IA-001` / `API-203` 等编号直接
画成标题、按钮或状态文案。旧规则虽禁止内部信息泄漏，但只靠 source grep 和人工 Gate；
同一编号在代码、test id 与诊断里又是合法的，因此既不能粗暴全仓禁用，也无法阻止“测试全绿、
页面文案仍怪”的结果。

- 新 PAGE contract 升为 `frontend-journey-contract/v2`，固定
  `copy_guard.forbid_internal_ids=true`；v1 继续只读兼容，不让既有项目/收据无故失效。
- 旅程命令按 AC checkpoint 与两档 viewport 导出紧凑 `frontend-visible-copy/v1` 文本 artifact；
  `frontend-validation.mjs` 校验 task/commit、required checks、viewport 覆盖和完整 SHA-256，
  并机械拒绝用户表面的控制面 ID。`taskctl` receipt event 记录 artifact hash/捕获数；命令重跑后
  再扫描一次，避免旧 artifact 冒充本次结果。
- 修正 mock/Stitch prompt 的上游污染：IA/MOCK ID 明确放进 source metadata，禁止渲染；
  `T-106` 改写成 `T106` 也仍判泄漏。普通文案使用用户词汇，ID 保留在 spec、代码、测试、trace
  与诊断元数据中。
- 回归先证明旧验证器会让“生成个啥 T106 / 调用 API-203”在旅程全绿时通过，再验证新版稳定
  FAIL；同时覆盖缺可见文本 artifact fail-closed 与正常文案 PASS。

## 3.7.0 — 2026-07-27（收敛式审核 + 真实 UI 旅程收据）

**起因**：对 Thirdspace-creator T-565/T-518 的逐轮尸检显示两个互为镜像的失衡。纸面侧没有
finding 身份、复审 delta 和合法新增条件，同一风险会换措辞/换方案/换文件重新成为 blocker，
current 与 history 混在长 review 里；运行侧则把 unit/component/page 局部绿色当成产品可用，
无法拦住“内容雷达列表已切到 B、selection/detail 仍停在 A”。同时旧文档把 hook、scope ledger
和状态日志的 enforcement 说得比实际能力更强。

- **`reviewctl.mjs` 收敛协议**：Round 1 完整审；Round 2/3 只销账稳定 `REV-*` 和检查
  `changed-lines/new-evidence/late-critical`。既有 finding 除 status/resolution evidence 与
  severity 单向下降外全部冻结；后续新增项必须绑定工具验证的 SPEC 新/改行指纹、项目内证据
  文件 SHA，或 late-critical 的硬证据/行锚点，首轮漏看的普通问题不能伪装成新门柱。扩范围
  只能 `minor/future`，三轮后转人裁决。Reviewer 不再自报 verdict；工具计算并写
  `PASS|CONCERNS|FAIL[REV:<hash>]`。
- **证据与历史分离**：`<spec>.review.md` 只留 current snapshot；完整 packet 进入
  hash-chained `review-events.ndjson`。receipt 绑定 task、SPEC/constitution hash、snapshot 和最新
  event；`taskctl start` 仅接受当前 PASS，`reconcile/CI` 查删列、篡改、过期和手工漂移。
  legacy review 不自动覆盖，旧 config 无 `receipt_policy` 时保持只读兼容。
- **有边界的 prototype 通道**：纸面不能回答时 finding 可声明 ≤240 分钟 bounded probe、
  sandbox write set、禁 production/真实用户数据/deploy/migration、teardown 与预期证据。任务保持
  📋，probe 只收证据，不借 FAIL 越权进入 BUILD。
- **UI 完成语义拆层**：PAGE_SPEC 新增 intent→outcome transition、即时反馈、settled
  postcondition、next action、back/refresh context、master-detail invariant 和 normal/minimum
  viewport；明确 logic / surface / journey / human experience 是四种不同结论。
- **`frontend-validation.mjs` + 验收 receipt**：真实 browser/desktop、非 fixture 且互斥的
  witnesses、loading/empty/error/back/refresh/repeat、两档窗口和全部 AC 后置条件缺一即失败。
  `taskctl complete` 对 `验收=待验` 拒绝任意绿色文字，只接受 compact report；strict 项目从
  config allowlist 取命令，在报告指定的精确 HEAD 上实际执行，并要求 PAGE contract 声明的
  现存 `watched_paths` 执行前后无 staged/unstaged/untracked 漂移；记录 command/output hash，
  再原子写 `PASS:<hash>`。报告、PAGE contract、命令映射或被监控代码后改，`reconcile` 重新
  报红；只改无关路径不让全部旧 receipt 失效。成功证据用命令/trace，不造截图堆。
- **enforcement 诚实化与兼容**：hook 只承诺已注册 Edit/Write 的即时 allowlist 拦截；
  shell/IDE 绕过由 taskctl/reconcile/CI 检出。状态 event 是 before/after SHA 流水，不冒充
  hash chain。scope budget 是结构化逐项明细 + 人工 gate 裁决，在通用 parser 出现前不再声称
  机器硬计数。fresh init 开 strict receipts 并 scaffold `SCOPE_LEDGER`；`--update` 保留旧
  config/BACKLOG/review，reconcile 红时正确返回非零。
- **并发写不再静默丢状态**：`taskctl` 与 `reviewctl` 共用项目级 exclusive writer lock，
  提交前还会重验 BACKLOG snapshot。两个 agent 同时改不同任务时，竞争方明确失败并重读，
  不再各自从旧快照整文件 rename、却都误报成功；崩溃遗留锁 fail-closed，不自动抢锁。
- **回归**：新增内容雷达 stale-detail、非法复审零副作用、合法 late critical、
  PASS/CONCERNS/FAIL receipt、三轮上限/换名不重置、legacy review 保全、Thirdspace 风格内嵌
  FAIL、strict 缺列/坏 config、fixture/jsdom/重复 viewport/伪 witness、required condition
  口头豁免、验收报告篡改、复审偷换 remedy/证据、伪 diff/伪证据、历史 commit、watched path
  staged/unstaged/untracked/后续漂移，以及 taskctl/reviewctl 并发写锁等测试；selfcheck 把
  verifier、schema、并发锁与 strict fresh fixture 纳入常驻检查。

## 3.6.20 — 2026-07-26(评审膨胀防线:scope-budget 闸门 + 对称量规 + 排水口 —— Thirdspace-creator 尸检落地)

**起因**:用户报「审核节点经常导致需求膨胀」。四路调查工作流(8 agent/65 万 token:项目证据链 + 22 条机制引文核验 + 16 项业界实践 + 复杂度闸门红队)证实:「评审提风险→作者全接→契约膨胀→新增物互相矛盾→再 FAIL」循环在 Thirdspace-creator 逐字可证——T-518 反馈入口膨胀成 839行/29 API 客服平台(251行/3 op 替代后最终 PASS)、T-516 周扫描膨胀成 1544 行 Saga/receipt 体系(R3 blocker 打的正是 R1 finding 催生的机制)、T-501 收缩 45:1 直通 BUILD。病灶不是评审太严,是**不对称**:缩水侧逐词词表+「永远 blocker」,膨胀侧连 category 类目都没有;一致性门再把入册的膨胀强制兑现成 API+TEST。朴素数量闸门被红队 12 路击穿(拆任务绕限/域名套利/JSONB 藏表/enum 藏操作/辩护词逆选择),按改良版落地:

- **新建 `gates/03-scope-budget-gate.md`(范围预算闸门)**:计量单位 = T-xxx 任务(cron/saga 照计,治"用户动作"漏洞);口径逐项可枚举(enum 分支照计操作、JSONB 语义列照计表,规避手法另记 finding;通用机器计数器尚未实现,3.7.0 澄清);触发线 新域0/表≤2/新操作≤6/role≤1——**触发≠fail,触发=收缩优先流程**:A 案收缩 diff 默认先行,B 案豁免须 HARD/风险表行+file:line 复用否证+宪法引文,用户在两个工件间二选一(不占三问预算);**拆任务不重置预算**——同 FR 家族 30 天共享 `orchestrator/SCOPE_LEDGER.md`(新模板)累计,同家族第 3 次豁免升级宪法级复审。**反错杀**:行数不是计量项,depth 复杂度(并发/幂等/资金,T-513/T-506 形态)带风险表背书的不许以"太复杂"要求简化。与 Hard-Limit Policy 分工写明:禁的是自动判死,触发线合法(gate 01 补分工说明,_COMMON §8 同步)。
- **spec-reviewer 补对称维度 + 风险处置纪律**:量规新增 **scope-inflation 行**(宪法未提的新 actor/平台/域 = blocker;计数规避话术 = major)——与 scope-reduction 对称,schema category 枚举同步(+enum 锁死);无效 finding 负面清单加两条:**风险直译建设**(风险类 suggestion 必须给 `{mitigate|accept|avoid|escalate}` 处置枚举,MVP 默认 accept,仅 数据丢失/安全/不可逆 默认 mitigate)与**无验收依据的能力扩张**(答不出"哪条已确认 FR 没它无法验收"→ 落排水口不产 finding);边界段写入**评审权限边界**(只检查已确认范围是否安全可实现,不把风险转成产品能力——T-516 循环原文为证);调用方新增**每轮增幅告警**(单轮 diff >20% 或新增 ENT/操作 → 先过 03 号门再进下一轮;评审不许当需求生成器)。
- **PRODUCT_SPEC 增「Future possibilities(排水口)」章**(Rust RFC 2561 + PEP 1 借形):评审建议/好想法/accept 的低危风险零仪式登记,不进注册表/矩阵/API/TEST,不适用 deferral 五件套(五件套只管已确认 scope)——**让"不接受"与"接受"同样便宜**,拆掉"接受最省"的棘轮爪;重复建议指向条目 dismiss(防无状态 reviewer 重提)。FR 强制标注来源(用户/`[REV-ADD]`/总览提案),[REV-ADD] 计入预算且 gate 01 价值注抽查加问成本对价("删了就有 XX 风险"不算完整答案)。
- **批发签核拆零**(_COMMON §9 + gate 01):确认①/② 时 `[REV-ADD]` 清单单独呈用户逐条过目,不折叠进整册签核(整册签核会把膨胀合法化成 approved scope 反受 change-control 保护——棘轮最后一扣)。
- **15b 补「必要性先于完整性」**:完整性门只答"写全没有","该不该存在"由 03 号门先答——切断"评审推高操作数→完整性门合规放大成 839 行"的放大器链路。**UI_MOCK 提案对称义务**:采纳 "(提案)" 格计入 SCOPE_LEDGER/预算,总览人审反向问"哪格可砍"(生图只会加格,减格由人产生)。SKILL.md §3/§5/gate map/selfcheck 清单同步接线。
- 调查原始数据(全部引文/核验/业界 16 项/红队 12 失效模式)存 session 4aa48b8e 目录 `review-inflation-audit-result.json`。

## 3.6.19 — 2026-07-18(Stitch 握手更正:MCP 版不吃图,文本蒸馏 DESIGN.md;总览图兼审功能面)

**起因**:用户指出 MCP 版 Stitch 不支持以图生图——skill 里写的"过审 mock 作 Stitch reference image 还原"这条握手根本走不通(核对工具面证实:`mcp__stitch__*` 只有 `create_design_system_from_design_md`/`upload_design_md`/`generate_screen_from_text`/`edit_screens` 等,**无任何图片输入工具**)。同时用户点破 gpt-image-2 的真正强项:给它系统目标,它参考业界同类实现画出完整系统总览——**总览图不只定风格,还能借它确认产品功能面**。落地:
- **握手更正(v3-3 新增专条 + gate 05 + registry stitch/codex 条目 + UI_MOCK 模板)**:过审图(总览+逐屏)→ **蒸馏成 DESIGN.md 文本**(设计系统章 = tokens/icon 族/组件;逐屏章 = UI_RULES 模板附录的 per-screen scaffold)→ `create_design_system_from_design_md` 建库 → `generate_screen_from_text` 逐页。reference image 仅在 gpt-image-2 逐屏生成内部用于锁风格(codex 内置 image_gen 吃图,Stitch 不吃)。
- **漂移点改判**:从"以图生图漂"改为"**蒸馏丢真**"——DESIGN.md 逐屏必须具体到布局分区/控件/示例数据,泛写"参照总览图风格"= Stitch 自由发挥 = gate 05 fail;验收方式改为 Stitch screens **对照过审 mock 图**逐屏核对。
- **总览图双重职责(v3-3 新条 + gate 05 功能面对账检查)**:总览人审 = ①风格定调 + ②**功能面确认**——gpt-image-2 参考业界画出的、spec 里没有的模块,要么走变更回写 PRODUCT_SPEC/PAGE_SPEC,要么显式砍掉记 DECISION_LOG;不置可否带进蒸馏 = fail(会变成无 binding 的真页面)。
- **总览图 prompt 新增 `[Creative latitude]` 段(用户确认后补)**:功能创意从"碰巧画出来"改为**显式邀请**——允许 gpt-image-2 额外提案 1-3 个业界同类系统通常有、本 spec 缺的模块格,带 "(提案)" 标签供功能面确认;逐屏生成阶段无此段(创意只发生在总览轮,逐屏严格按 spec 装配)。

## 3.6.18 — 2026-07-16(评审模型换轨:MiniMax → Codex GPT-5.6 Sol,用户指定 + 实测过关)

**起因**:用户指定 spec-reviewer 跨模型评审弃用 MiniMax,改用本机 Codex CLI 的 GPT-5.6 Sol。换轨前按纪律实测(埋雷迷你 spec:云端存储违宪/漫游偏定位/"v1 简化版"缩水/无量化验收):`codex exec -m gpt-5.6-sol --output-schema` 完整评审 ~38s,**四雷全中且每条引原文**,verdict 正确 FAIL;`--output-schema` 比 mmx 多了 schema 级 JSON 强制,净升级。落地:
- **spec-reviewer 执行契约①改写**:cross-family 首选 = Codex GPT-5.6 Sol(命令形态+前置检查 codex login status);新增 **`prompts/spec-reviewer.schema.json`**(实测过的 findings schema,--output-schema 直用)。**坑入册**:禁传 `-c model_reasoning_effort` 覆盖——实测挂起 10 分钟+,默认档已够。
- SKILL.md 评审链同步(①codex sol → ②claude 跨模型 → ③同模型 WARN);个人记忆层追加"mmx 全线降为仅点名时用"。

## 3.6.17 — 2026-07-16(imagegen 通道选择坑定案:CLI 旋钮会把 codex 推上要 key 的路径)

**起因**:3.6.16 误诊事件拿到原始输出定案——codex 的 imagegen 有两条路:**built-in image_gen 工具**(默认,走 ChatGPT 订阅、无需 OPENAI_API_KEY,且其说明书明文禁止向用户要 key)vs **CLI fallback**(`scripts/image_gen.py`,要 key,仅用户点名走 API 时用)。项目会话的调用带了 `--model/--quality/--output-format` 等 **CLI 专属参数**,把 codex 推上了 CLI 路径 → 报"缺 key" → 被误诊为"imagegen 不吃订阅"。项目侧按指令用内置通道复测已通过(30.7k tokens)。落地:
- **registry `codex:gpt-image-2-ui-mock` boundary_rules 加「通道选择坑」**:给 codex 的指令禁止带 CLI 专属旋钮;正确措辞「用内置 image generation 生成…保存为 xxx.png」;画质/格式要求写进图像 prompt 正文,不写成命令行参数。
- **UI_MOCK 模板执行指令措辞同步**(v3.6.14 拆分条款下追加)。

## 3.6.16 — 2026-07-16(生成通道标注纪律;"缺 API key"误诊尸检)

**起因**:项目会话称 codex imagegen 失败"因缺 OPENAI_API_KEY(imagegen 走 API 计费不吃订阅)",降级 HTML+Playwright 渲染冒充 mock 送审(被问才承认),并顺势向用户要 API key。主会话双重实测证伪:同机无 key、ChatGPT 订阅登录,codex exec 生图当日两次成功。教训三条入模板收尾纪律:
- **生成通道必须标注**:每张送审图注明 gpt-image-2 / HTML 渲染 / Stitch / 手供——生成方式是一等事实(HTML 渲染是合法 fallback:token 像素级一致但排版保守)。
- **降级当场报告**,不许事后被问才承认。
- **失败先贴原始错误**再定方案,禁止把失败脑补成"缺 XX 配置"直接向用户要凭据/要钱——错误归因上的花钱方案正是 anti-sycophancy 与诚实原则要拦的形态。

## 3.6.15 — 2026-07-16(house style 内置:品牌默认设计语言,风格探索轮默认降为确认制)

**起因**:用户拍板把 CreatorOS 设计语言(「白底紫魂的数据工作台」)定为脚手架内置默认风格,与品牌调性一致。与 3.6.13 不矛盾——探索轮的目的是拿到用户的风格拍板,现在拍板预置在 skill 层,agent 仍不凭空拍审美,只是继承。落地:
- **`templates/HOUSE_STYLE.md`**(新):完整设计语言一页纸——shadcn/ui+Tailwind v4+自有 token 层、紫魂灰底双主题色板(brand `#6d4aff`/浅底/语义色各配 -soft)、圆角三档/阴影极轻/布局常量、Noto Sans SC+tabular-nums 小字高密度、交互纪律(data-slot 锚/诚实 UI/确认词门/候选卡采纳门);**附「装配映射」段**供 mock prompt `[Design system]` 逐字取值。层级:skill 层默认,项目 UI_RULES 从它起步、覆写合法优先、偏离记 DEC。
- **风格探索轮默认确认制**:新项目直接按 house style 装配、跳过候选探索,DEC 记「沿用 house style」;用户点名换风格/调性明显不合(如儿童消费级)才走 3-5 候选探索制。gate 05 tokens 溯源同步:指向 house style 采用记录即合法。

## 3.6.14 — 2026-07-16(跨模型评审 prompt 模板:五增量吸收 + 两类误判裁决入册)

**起因**:用户把实际装配产物(agent-distribution PAGE-001 prompt)交给 GPT(image2 侧)评审,得 8.5 分 + 八条批评。分层裁决:
- **架构误判(不吸收但记录)**:其最大建议"别优化 prompt,先做 IA/页面清单/用户任务/数据模型再生成 UI"——**这正是本流水线本身**,它评的 prompt 就是该管线的下游装配产物;它只看到最后一英里,把上游管线当缺失反推了出来。8.5 分实为整条管线的分。
- **spec 层问题(走既有回路,不改模板)**:KPI 卡混维度/图表选发码不选收入 = PAGE_SPEC 内容缺陷被忠实渲染——**证明 mock 人审的第二重价值:看图比读 spec 更容易审出业务错误**。模板新增一节:mock 审出的内容缺陷回写 PAGE_SPEC 重装配,禁止直接改 prompt 绕过 spec(防 mock 变第二真值)。状态设计已由四态纪律覆盖。
- **模板五增量(吸收)**:`[Design goal]` 段(角色+10 秒内要看懂的 P0-P3,从 PAGE_SPEC 推导)/`[Priority]` 冲突解序(信息层级>可用性>布局>视觉>装饰)/Canvas 桌面端声明(防乱缩)/组件一致性一句/反 AI 味负面清单(Dribbble 装饰/巨大数字/过度留白/fake-SaaS)。
- **真 bug 修复**:执行指令("生成并保存为 xxx.png")混进图像 prompt 文件——规则化拆分:prompt 文件只含图像 prompt,执行指令由 codex exec 命令行携带。

## 3.6.13 — 2026-07-16(风格探索轮:图→tokens→图,治"agent 凭空拍审美";实战首例尸检回流)

**起因**:视觉收敛链真项目首跑翻车——agent 在 UI_RULES 里自定"暗色高密度对标 DaVinci"tokens,装配与渲染全程忠实,用户见第一张图才发现方向全错且"太简单"。定性:**3.6.11"agent 不代用户拍视觉方向"有漏洞——方向的第一次拍板发生在写 tokens 时,而那步无人审**;"不满意去改 UI_RULES"技术上对、流程上倒置(审美要人看图表态,不能让人见图前用文字押注)。三处落地:
- **三段式(图→tokens→图)**:新增第 -1 步**风格探索轮**——产品核心页(信息最密屏,顺带暴露密度问题)做载体,3-5 张候选每张只变 `[Style hypothesis]` 段(布局/文案逐字相同,保证选的是风格不是内容);生成前 2-3 个定向问题(对标/亮暗/密度)+收用户参考图。人审①选向后 **tokens 从选中图归纳**进 UI_RULES(非 agent 发明)→ 第 0 步总览图(人审②)→ 逐屏 → Stitch。
- **gate 05 新增 tokens 溯源检查**:UI_RULES 视觉 tokens 必须指到 DECISION_LOG 的风格选择记录,凭空审美 = fail。
- **"太简单"正解入册**:单屏密度上限 = PAGE_SPEC 细致度,回 spec 补控件/数据再重装配,不是堆形容词。

## 3.6.12 — 2026-07-16(UI 审核改两段式:风格总览图先行,用户拍板)

**起因**:用户给出参照样例(「宠物门店 AI 预约小程序 UI 设计稿」式的单画布多屏总览海报),指出 3.6.11 的"每模块一图才开审"会导致未定调就批量逐屏、风格错全部重来。改为**两段式**:
- **①风格总览图先行**:第一张审的图 = 一张「UI 设计稿总览」画布(标题 + 每个 FEAT 的 IA 主面各占一格)——用户一次看到整个产品的脸,在成本最低点定风格;风格错重抽一张即可。**总览未过审就逐屏批量生成 = gate 05 fail**。这也天然满足"每模块一图"(全在一张画布)。恰是 gpt-image-2 强项(多元素复杂排版)。
- **②过审总览作 reference image 逐屏生成**(单屏细节可按批审)→ 过审单屏进 Stitch 还原。
- 模板新增第 0 步「总览图 prompt 变体」(Use case/Canvas/Screens 三段替换,画布网格+逐格 label+全画布统一系统);v3-3 人审硬门与 gate 05 覆盖度检查同步改写。

## 3.6.11 — 2026-07-16(UI 人审硬门 + 每模块一图覆盖度,用户点名)

**起因**:用户拍板两条硬规则:①UI 设计必须人审核,过审才能继续;②每个功能模块要有一张图。此前"用户挑方向"只是链条描述无门效力。落地:
- **人审硬门**(v3-3 + gate 05 + mock 模板三处同步):mock 未经用户审核通过,不得进 Stitch 还原、不得据此写 UI_RULES/PAGE_SPEC、不得进 BUILD——**agent 不代用户拍视觉方向**;审核记录(选中/否决+理由)进 DECISION_LOG,无记录 = gate 05 fail。人审是选图动作本身(分钟级),但阻塞性。
- **每模块一图覆盖度**:申请审核的前置条件 = 每个 FEAT(其 IA 主面)至少一张 mock,只画首屏不许开审——用户要一次看到整个产品的脸;模块多可分批,批内按模块成组。gate 05 新增两条对应检查。
- v3-3 门区措辞更新:阶段级仍无第四次全量确认,但视觉收敛链内嵌一次轻量阻塞人审。

## 3.6.10 — 2026-07-16(UI mock 提示词模板:精准度来自装配不来自文笔)

**起因**:用户点破 3.6.9 的缺口——CreatorOS 的 UI 正是"ChatGPT 手聊出 gpt-image-2 图 → Stitch 还原"做的,现在 agent 接管这条链,但担心 agent 提示词写不好(产品系统 UI 需要极精准的 prompt)。盘点:Stitch 侧有 per-screen scaffold(UI_RULES 附录),gpt-image-2 mock 侧没有模板。落地:
- **新模板 `templates/UI_MOCK_PROMPT_TEMPLATE.md`**,综合两源:本仓 Stitch scaffold 的 canonical 条款(两模板「Design system MUST MATCH」逐字同源,一套 canonical 两个消费端)+ 业界实践(OpenAI 官方 prompting guide 的结构化五段 Scene/Subject/Details/Use-case/Constraints;逐字文案放引号,gpt-image-2 文字渲染 >95% 含 CJK;编辑迭代拆 change+preserve 两段)。
- **核心原则写死:prompt 是装配出来的,不是写出来的**——每字段从上游 spec 机器装配(布局/控件文案←PAGE_SPEC binding 表,tokens/icon 族←UI_RULES,真实感数据←MOCK_DATA_SPEC),agent 不自由发挥;spec 没有的视觉决策要么回 spec 补,要么显式标注为探索变量(一次只探索一个,否则用户选了也无法归因)。
- **系列一致性**:首屏选定后作 reference image 传入后续屏(文字 tokens + 图像参照双保险);产物归档 docs/design/mocks/(evidence 级),用户选择与否决理由记 DECISION_LOG。v3-3/registry 接线同步。

## 3.6.9 — 2026-07-16(DESIGN 视觉收敛链:gpt-image-2 mock ⇄ Stitch 还原串联)

**起因**:用户发现本机 Codex CLI 已内置 gpt-image-2(2026-04 发布,实测可用:订阅额度、文字渲染 >99%),问能否与 DESIGN 阶段的 Stitch UI 还原串起来。盘点确认真空:UI 探索模式分支没有指定生成工具;Stitch image-to-image 的 reference image 只能靠用户手供设计物。落地:
- **skill_registry 新条目 `codex:gpt-image-2-ui-mock`**:输入 = UI_RULES tokens + IA 页面目的,输出 = mock 候选(探索稿章)→ 供人挑方向 + 供 Stitch 当参考图;含实测命令形态。
- **v3-3 DESIGN 新增「视觉收敛链」规则**:tokens(文本 canonical)→ gpt-image-2 候选 → 人选 → Stitch 还原 → gate 05。防漂移纪律:**mock 是候选不是 canonical**,与 tokens 冲突以 tokens 为准,prompt 钉死色板/字体/单一 icon 族,mock 不许直接当切图进 BUILD;探索稿分支的执行工具同此。
- **通道纪律入册**:生图默认 Codex gpt-image-2,MiniMax 仅用户显式指定时用(2026-07-16 用户质量反馈,已同步个人记忆层)。stitch 条目 input_contract 注明参考图供给端闭环。

## 3.6.8 — 2026-07-15(INDEX 账实漂移入册:同族病第三例,规则+可执行门根治)

**起因**:CreatorOS specs/INDEX.md 写"**50 份**"实存 84 文件、缺 07-06 后十几条、状态列标"待过审"实早交付——账实不符同族病第三例(BACKLOG 台账 → 追溯矩阵 → INDEX)。病根三个:手写活计数(可推导的数字手维护必过期)、INDEX 复述 REVIEW_LEDGER 拥有的审核状态(第二真值)、新文件落地不登记无人报。吸法 = 规则+门,不加 lesson(有规则家就不占 lessons 位):
- **knowledge-layer §2 INDEX 三条纪律**:禁写活计数(要么脚本生成要么不写)/不复述其他台账拥有的状态(只放链接)/新文件当轮登记;根治方向 = INDEX 机械部分(条目/计数)本质是 derived,手写只写一句话摘要这类语义增量。
- **docs-health 新增检查 4/5**(仍守"窄而准":机械账实核对非文档学):INDEX.md 同目录 .md 必须有索引条目(只查同层不查子树,收据/子目录不逐列防噪音)+ INDEX 内「N 份/N 篇」活计数即报。fixture 实测:漏登/活计数命中、--strict exit 1、修好即净。
- 注:该检查随知识层启用生效(无 knowledge.config 跳过);CreatorOS 未启知识层,其 INDEX 修复走后台任务卡——修法应是**去重**(删状态列+活计数,状态归 REVIEW_LEDGER)而非把两处对齐一次(下周又漂)。

## 3.6.7 — 2026-07-15(CI 验证门接入脚手架:从"审计要求"变成"init 自带")

**起因**:用户问「都用 git 管代码,CI/CD 接入了吗」。盘点定性:要求有(field-lessons #58)、审计有(prelaunch 维度 4),但**执行层缺位**——init 不产 workflow、无 CI 模板,每个项目都要等审计报"没有 CI"才回头补(CreatorOS ENG-H01 实证);且 vendored 守卫全是零依赖纯 node,天然能进 CI 却没接。三处:
- **`templates/CI_VERIFY_TEMPLATE.yml`**(新):GitHub Actions 形态 main/PR 验证门——runtime 版本对齐 engines(node-version-file)+ 项目 verify 四件套(typecheck/test/lint/build,占位标注按 PROJECT_CONTEXT 改)+ **`reconcile.mjs` 进 CI**(契约追溯/边界棘轮/台账健康/知识层漂移在干净环境重跑;"本地绿 CI 红 = 本地有未提交隐性依赖")。非 GitHub 托管按注释搬 steps;无远端项目留着无害。
- **init-project.sh 5b**:幂等放置 `.github/workflows/verify.yml`;`--update` 不覆盖(项目改造后归项目所有,与 config/baseline 同策略——实测定制行存活)。
- **v3-5 SHIP 完成标准**:发布证据可重复 = verify CI 绿;无远端项目显式 accepted-risk(干净 worktree 全量 verify+reconcile 替代,证据进 RELEASE_REVIEW)。**CD 有意不自动化**:git push/deploy 是人的确认点(state machine STOP #4),模板注释写明防将来"顺手加自动部署"。

## 3.6.6 — 2026-07-15(T-337 日志/可观测性审计回流:第二个结构性盲区补席位)

**起因**:CreatorOS T-337 审计(`docs/research/2026-07-15-logging-observability-audit-research.md`)——业务日志及格线、AI trace 不合格(只有事故门牌号没有黑匣子)。定性:与安全(3.6.0)同性质的结构性盲区——全流程没人问过「客户报障怎么复现」,现有 gate 一条都拦不住。四处落地:
- **prelaunch-engineering-audit 第 6 维度「可观测性与可支持性」**:核心一问「用户隔天报障靠什么定位」;检查点=复现路径(保留窗口≥反馈延迟/诊断导出)、AI 黑匣子(prompt/响应/token/主路 or 兜底;先查 SDK 自带 telemetry;字段对齐 OTel GenAI)、降级留痕、trace 贯穿(复用维度 2 消费点判定)、错误分类码、前端痕迹(全局兜底落盘+可调级别)。
- **PRODUCT_SPEC NFR 引导**:必含一条可支持性 NFR——上游一行字省下游一次专项审计。
- **field-lessons 新主题 I**(70-73):静默降级=假成功兄弟 / AI 黑匣子+本地优先零 PII 独家优势+有轮子先用 / trace id 不贯穿等于没有(#59 观测层实证) / 日志保留窗口≥反馈延迟+前端错误必须有落盘通道。**#13 强化**:失败分类的系统化形态 = error_code 枚举进 contract,重试与观测共享同一套。
- **不吸收**(留 T-337 SPEC/项目):logger 封装选型、轮转参数、ai_call_log 表设计、Pi 转录落盘——项目级实现细节。

## 3.6.5 — 2026-07-15(并行 lane 规划算法 + neat-freak 借形吸收)

**两件一起落(用户拍板)**:
- **并行规划者补位**(`parallel-collab-rules` 新增 §0):既有协议只说"write_set 不相交才准并行",但谁来把一批任务切成不相交的几条线没有方法论。五步算法——write_set 从 `boundaries.config`+codegraph **计算**而非人猜(借 Bazel/Nx affected-graph)→ lane 编组 = 相交图连通分量(lane 内串行/lane 间并行,借 Stacked PRs)→ 跨 lane 共享任务 **hoist 为 wave-0** 先做合入 → 合并顺序规划时定(短 lane 先合,每合一条 rebase+全量 reconcile/verify,红了弹回 = 单机 merge queue,借 GitHub MQ/Bors)→ 波次计划落盘 `orchestrator/waves/`。含 worked example(A:T-1,2,3 / B:T-3,4,5,T-3 横跨即 hoist);PARALLEL.md/v3-4 互引对齐。规划质量随 write_set 预估精度进化,预估失误进波次复盘栏。**克制**:先方法论不造 wave-plan.mjs,机械化价值等实战暴露(表格从尸检长出来)。
- **neat-freak(洁癖.skill 开源版)评估后「登记+借形」,不整包内嵌**:其 docs 四件套组织与本 skill 知识层目录标准是两套 canonical,整包跑会造双真值——skill_registry 登记 `neat-freak:knowledge-cleanup` 并写明防腐约束(脚手架项目以知识层为准,仅非脚手架项目/用户点名时整包用)。吸收三个正交机制进 `knowledge-layer-rules` **§8**:①**记忆毕业**(反向阀门:docs 就地编辑收敛 vs memory 只追加必膨胀;三判据+一句话判据「下一个接手的人需要知道吗」+体量倒挂体检+25KB/200行静默截断事实)②**规则文件也会烂**(AGENTS.md 死引用/漂移/矛盾进收片核对与 SHIP 审计)③**规则手册不是变更日志**(判据「下次 AI 没看到会不会犯错」,单次净涨幅 >30 行红灯)。DoD 第 6 步补判据锚点。

## 3.6.4 — 2026-07-15(BACKLOG 膨胀根治:机械工具 + 失控线,fail-open 补口)

**起因**:用户点破「BACKLOG 过于膨胀 + 任务完成后不更新,根治了吗」。盘点定性:规则在(task-ledger-rules 铁律 5 条)、检测在(backlog-health 实测 CreatorOS 114KB/单行 1192 字全查得出),但**执行缺位**(压缩全靠手工,铁律 3 自己预言"以后永远不来")+ **接线故意松**(reconcile 永远 WARN,永远黄灯没人清)——经典 fail-open。三件套:
- **机械工具 `process/backlog-compact.mjs`**(新):一条命令把 `## ✅` 完成区行归档到同目录 `BACKLOG-archive.md`(只进不改按日期分节),留最近 `--keep` 条(默认 5);活动区 ✅ 行默认不动(可能"刚完成待复验"),提醒后 `--all` 才迁;`--dry-run` 预览;幂等。语义压缩(超长 📋/🔨 行压一句话/教训回流)仍是 agent 的活,工具收尾指回 health 清单。
- **失控线**:backlog-health 新增 >60KB(2× 硬限)= RUNAWAY → **exit 2**;reconcile 接线分级——exit 1 保持 WARN(卫生债不 block,尊重 3.3.0 决策),exit 2 升 **ERROR**(台账失控时每个会话都在付税,"无关工作"不存在;且机械修复一条命令,block 代价低)。
- **状态列一致性检查**(铁律 2/4 可执行化):状态 cell(📋/🔨/✅ 开头)>60 字 = 塞了过程叙事 → WARN——治"完成后不好好记账"的机器可查形态;"做完不翻状态"本身不可机器判定,仍靠 DoD「✅+commit」+ taskctl 唯一写入口。
- 真机验证:fixture 41KB→exit 1/86KB→exit 2;compact 40.9KB→2.7KB、留 5 条、活动区 ✅ 不动、--all 迁走 🔨 留下、幂等、compact 后 health 自愈 exit 0;git stderr 泄漏修掉。task-ledger-rules 可执行门节改写。
- CreatorOS 落地排期:T-328 并行波飞行中**故意不立即 --update**(新 ERROR 会 block 其 harness);T-333 入板=收口后 --update + compact --all + 语义压缩。

## 3.6.3 — 2026-07-15(vendored 引擎升级通道:老项目吃到新脚手架)

**起因**:用户点破真实缺口——skill 进化后,老项目里 init 时 vendored 的 `orchestrator/process/` 是旧快照,且 init 幂等 SKIP 导致重跑也不刷新;规则/门/prompt 活读即时生效,引擎侧却永远停在 init 那天。三件套补口:
- **版本章**:init 首次 vendor 时写 `orchestrator/process/.skill-version`(version + skill_dir)。
- **`init-project.sh --update`**:刷新引擎文件与两个 hooks;**保留**项目 `*.config.json`/`*-baseline.json`/控制面/BACKLOG/AGENTS.md;skill 里已删除的文件不删只列出(stale 提示);用户改过的 hook 备份 `.pre-update`;重盖版本章后自动跑 reconcile——红了要求 fix forward,禁止回滚引擎消音。
- **漂移提示**:session-start hook 末尾对比版本章 vs skill VERSION,过时即注入升级命令(fail-open:无版本章/skill 不在则静默);SKILL.md 启动步骤加 agent 侧兜底检查(老项目 hook 是旧版,靠 agent 读 SKILL.md 补位)。
- **真机验证**:临时项目 fresh init(版本章落盘)→ 伪造旧引擎/定制 config/孤儿文件/改 hook → `--update`:46 文件刷新、`custom_marker` config 保留、孤儿列出未删、hook 备份 `.pre-update`、版本章 3.5.1→3.6.2、reconcile 绿;漂移提示准确、版本一致静默。顺手修一个真 bug:bash 3.2 下 `$sv` 后紧跟中文标点会解析坏变量名(输出乱码),改 `${sv}`。
- 存量项目(如 CreatorOS)升级 = 跑一次 `--update`;建议在其无并行会话时做。

## 3.6.2 — 2026-07-15(两篇外部实践对照借鉴:卡兹克 16h/天流程 + Addy Osmani Agent Skills)

**起因**:用户给两篇文档做对照。判定:六成印证已有设计(跨模型审查/harness 自治/canonical 同步/反合理化表/硬检查一票否决),四成真增量,按用户裁决落地:
- **四端统一(代码/文档/规则/记忆)**:BUILD DoD 第 6 步核对范围扩到 `AGENTS.md`/`CLAUDE.md`/agent 记忆中被作废的约定(旧约定 = 毒化下个会话的假上下文);收据模板同步。(借:卡兹克 洁癖.skill;用户裁定必加)
- **测试分层路由**:片级反馈环只跑受影响子集+冒烟(秒级),全量放汇合点/CI;分层不许牺牲最终覆盖(反洗白条款适用)。(借:卡兹克"提测 5 分钟循环是节拍杀手")
- **防锚定传递纪律**(spec-reviewer):审查者只拿 宪法+工件,**禁传作者自评/CLAIM**;第三方框架陈述("同事交来的方案")。(借:Osmani DDD"只传 ARTIFACT+CONTRACT 不传 CLAIM",合并上轮"隔壁同事"框架)
- **Doubt Theater 检测 + STOP 上限**(spec-reviewer):连续 2 轮零可执行 finding = 假装审查,换模型重审;同一工件修复→重审 ≤3 轮,仍有 blocker = 工件没准备好,回上游而非原地磨。(借:Osmani DDD)
- **Anti-sycophancy 进 global-rules**:明显问题直接指出+弊端+替代,知情坚持则执行并记 DEC;禁止淡化真问题。(借:Osmani "not a yes-machine / don't soften real issues")
- **借口对照表惯例**(_GATE_EVIDENCE):被洗白过的 gate 才配借口对照表,从尸检长出来,不做全量 ceremony。
- **明确不采纳**:部署后线上验证步(用户裁定:快速开发期无稳定线上环境,不适用——已上线服务另说);自建 CI 服务器(项目级运维);"语音瞎 BB 直接开跑"(与 3.6.x PLAN 价值层方向相反,他的"简单"建立在重基建+单人全上下文之上);并行 6-7 上限经验值(未获用户圈选,暂不入)。

## 3.6.1 — 2026-07-15(PM 视角补全:用户点破"我的理解可能片面,你来补视角")

**起因**:3.6.0 的价值层是沿用户给的三角度(合理性/应用性/商业)映射业界框架;用户要求以独立 PM 视角复查缺口。补五件、拒两件:
- **替代品与切换分析**(JTBD 切换四力借形):必含「忍着不解决」行(切换成本为零的最强竞品)+ 切换触发器/切换成本——没有它,value 风险行的证据悬空。
- **被否决的产品形态 ≥2**(防锚定):方向返工的最大来源不是"没价值"而是"价值真实但做成了第一个想到的形态";只考虑过一个形态 = gate fail。
- **依赖风险升第五大风险**(风险表加行):第三方平台接口/ToS/风控/上游模型——field-lessons 整个 B 主题的坑在 SPEC 层有了席位;pre-mortem 至少产出一条依赖死因。
- **RAT 规则**(riskiest assumption first):「若错代价致命」且「检验 ≤半天」的风险行必须在签核①前检验并回填——"多花功夫在 PLAN"的直接兑现。
- **Success signals 结构化 + 发布后闭环**:北极星/护栏/检验时点(第 N 天/阈值/触发动作)三件套,无时点无阈值 = 装饰;SHIP 新增第 7 步「埋回看点」抄进 RELEASE_REVIEW,到点回看,**被证伪的商业假设也是合法产出**。另:Target users 必含非目标用户(anti-persona,防 scope creep)。
- gate 01 / spec-reviewer value-viability 维度锚点同步。**拒收**:Kano/RICE 优先级分层(与"完整目标产品、不切 P0/P1"哲学冲突,appetite 已承担 scope 收敛)、利益相关者矩阵(个人项目 ceremony)。

## 3.6.0 — 2026-07-15(T-326 上线前审计回流 + PLAN 价值层强化;业界方法借形落地)

**起因**:CreatorOS 上线前独立审计(T-326,`Thirdspace-creator/docs/research/2026-07-15-prelaunch-full-engineering-data-audit-research.md`)在"每片 DoD 绿 + product-audit 绿"之下审出 4 Blocker + 26 High。盘点定性:53 条发现里 30+ 条归两个结构性缺口——①脚手架从 PLAN 到 SHIP 没有安全/工程可上线性维度;②"策略声明了没人执行"无人核查。另用户点名 PLAN 阶段要加码:更细的 SPEC + 产品合理性/用户应用性/商业三视角前置,降返工成本。业界方法借形不照搬(与 3.3.0 拒 ceremony 口径一致——每项都有 T-326 尸检或返工成本背书):

- **新资产 `prompts/prelaunch-engineering-audit.md`**(形态参照 Google SRE Launch/Production Readiness Review,安全清单参照 OWASP ASVS 精简 + LLM Top 10):独立上下文 agent、源码为准,五维度(攻击面/策略言行一致/数据事务幂等多租户/构建发布链/门禁自身健康),GO·NO-GO 裁决 + 重审门槛;挂 v3-5 SHIP 第 4 步,**Blocker=0 且 High 全归属才进签核(确认③)**;SKILL.md §6 增指针。
- **PLAN 价值层**(治返工杠杆最高的方向错误):`PRODUCT_SPEC_TEMPLATE` 新增 Value & viability 章——PR-FAQ(Amazon Working Backwards,FAQ 须直面定价/替代品/迁移成本)+ 四大风险表(Marty Cagan:value/usability/feasibility→指 HARD/viability,空话即 fail)+ 采纳门槛表(time-to-first-value)+ 一条可证伪商业假设 + pre-mortem ≥3 条(Gary Klein)+ appetite(Shape Up,装不进就显式砍 scenario 不许静默降质量);**每 FR 带价值注「删了它用户失去什么」**,答不上 = 伪需求。gate 01 逐项锚点 + spec-reviewer 新增 value-viability 维度(category enum 同步)。价值章位于 FR 拆解之前——价值判定先于需求拆解。
- **经验入册 `rules/field-lessons.md`**:#45 补重踩标注(FE-H01 重踩"轮询匹配全终态",重踩教训注入优先级升高);F 主题 +4(55-58:验证器起不来是 Blocker/噪声数字先查 scope/build 只读/发布证据 CI 可重复);新主题 **G 契约与策略的言行一致**(59-63:策略字段要有消费点/白名单测集合等价/prompt 送达验证/禁传输层填占位假值/非数据 fixture 进退役台账)+ **H 数据事务与多租户**(64-69:批量幂等/幂等键放首写/作用域维度三处全扫/软引用删除清单/catch-all 恢复窄匹配/外部副作用可对账)。
- **既有资产补口**:`mock-data-rules` 增"catch 回退 fixture 是兜底禁令最高发形态(grep catch 块)"+"非数据形态 fixture 也进退役台账";`gates/15b` 增 Policy field consumption 检查(声明未消费的策略字段 = implement or delete)。
- 项目级细节(B-03 重锚/RT-M 系列/FE-M 系列)按 knowledge-layer §7 留 CreatorOS 项目坑册,skill 只收范式。

## 3.5.2 — 2026-07-15(canonical 语义漂移补口:文档回写进 DoD + 审计抽查)

**起因**:用户实战反馈「实现和文档有偏颇,不知道后面有没有去更新文档」。盘点确认缺口真实:`knowledge-drift.mjs` 只护 derived(hash 可查),`docs-health.mjs` 只管卫生不管内容真假,canonical(BUSINESS/UI/PAGE_SPEC)的语义漂移全靠 agent 自觉走 change-control——小的实现偏离常被当"实现细节"悄悄过去。补两道,一防新增一清存量:
- **防新增**:v3-4 BUILD 片级 DoD 增第 6 步「文档回写核对」——收片时对照 canonical,出入三选一(回写 / change-control / 确认无出入),结论记 block 收据新增的「文档核对」栏,**留空 = 片未完成**(`BLOCK_RECEIPT_TEMPLATE.md` 同步加栏);knowledge-layer-rules §5 BUILD 行同步。
- **清存量**:`prompts/product-audit.md` 跨页横切检查增「canonical 语义抽查」——抽 2-3 个模块拿 BUSINESS 规则/状态机 + UI 四态/绑定表对着运行中产品走,漂移即缺陷且双向定性(实现错修实现,文档旧当轮回写),不许"以后再对齐"。
- 设计取舍:**不做** canonical 语义的自动检测脚本(文档语义 vs 代码行为无法 hash 化,强上只会造 ceremony)——防线放在 DoD 硬步骤(留空可查)+ 审计节拍抽查,与 3.3.0 拒绝 docs-health ceremony 的口径一致。

## 3.5.1 — 2026-07-11(research-as-asset:调研产出一等资产化)

**起因**:CreatorOS 执行层选型日(六引擎盘点/Remotion license 核查/Claude Code 蒸馏)——用户点破「这些探索踩坑研究都形成文档资产没有?」,盘点发现 SPEC 只收结论、过程证据散在对话与主 agent 私有记忆里。固化:knowledge-layer-rules 新增 §7 —— 调研类子代理产出必须归档 `docs/research/`(对比表全量含被否决项)、实施坑当轮进项目 `docs/engineering-notes/pitfalls.md`、跨项目范式升格 `rules/field-lessons.md`、调研派发契约末尾必带「可直接归档的结构」要求。首批实例:CreatorOS `docs/research/2026-07-11-agent-engines-and-renderer-research.md` + `docs/engineering-notes/pitfalls.md`。

## 3.5.0 — 2026-07-10(整合升级收官:人话 README + eval 接线;三方案整合落地)

**起因**:用户拍板执行《最终整合方案》(整合三份输入:知识层方案修正版 + Codex「确定性操作系统」方案 + 子代理派发契约诊断;Codex 的 5 条 harness fail-open 指控**全部验尸坐实**后全收,重件降级为 lite,Sentinel/完整 Adapter/SQLite replay 等进 Roadmap 不做)。CreatorOS 一路返工的教训全部固化为默认拦截。本版为收官:README 人话重写(协作工作流/关键节点/关键文档/文档结构)+ selfcheck 接入 harness 语义回归套件(5 例 fail-closed)+ 全部新资产进绊线清单 + SKILL.md 集成指针。执行方式:4 个实现子代理并行(每个按 subagent-dispatch 六要素派发,吃自己的狗粮)+ 主 agent 逐项亲手复核(不信"全绿")+ 按版 commit。

**四个功能版(各自独立 commit,见 git log)**:
- **3.3.1 Trust Repair**:progress.json 路径统一(orchestrator/progress.json);沉默 reviewer / 缺状态文件 → FAIL-CLOSED HOLD(原 `return 0` fail-open 链已死);verdict 权责分离(evaluator/rebuttal 只读只出 verdict + ESCALATE,`run.sh` 经 `progress.mjs verify` 成为 e2e_verified 唯一写入者);generate 保留 e2e_verified;verify-task.sh 命令配置化(缺配置显式 FAIL 不猜默认);coding-agent.md 清被 R1 禁止的旧布局示例;`semantics-test.sh` 5 例回归;`prompts/subagent-dispatch.md` 六要素派发契约(治子代理死循环:受阻 2 次即停 / hook 拒 = 政策禁止);selfcheck 增"未提交改动"进化绊线。
- **3.4.0 事务控制面 lite**:`taskctl.mjs` 状态转换支持入口(审核列阻断 start / 无 --evidence 拒 complete / --expect-sha 并发守卫 / `orchestrator/events.ndjson` 记录 before/after SHA 审计流水；它不是 hash chain,3.7.0 澄清);BACKLOG/Manifest 保持人类可读 canonical(**拒绝**"变生成视图"——会砸 hook 生态与手编辑);`_GATE_EVIDENCE` 增「硬检查一票否决,模型共识只用于主观层」。
- **3.4.1 产品知识层**:docs 按产品模块组织(features/journeys/data-flows),真值四级首行标记(canonical/derived/evidence/archive,只有前两级进 agent 默认上下文),ID 增 FEAT/DFLOW/AC;**业务语义人写、代码事实脚本生成**:`feature-sync.mjs`(确定性、hash 章)⇄ `knowledge-drift.mjs` 成对落地;`knowledge-coverage.mjs` + 窄版 `docs-health.mjs`(坏链/archive 泄漏/truth 标记,故意不做 Diataxis/C4);三守卫接 reconcile(校准期 WARN-biased,无 config 优雅跳过);templates/knowledge/ 七模板。
- **3.4.2 Context Compiler**:`context-compile.mjs` 按任务编译 9 节确定性 Task Packet(含派发六要素);session-start.sh 只注入压缩 top-N 可执行行(治 204KB 看板注入 146KB 被宿主转存=等于没注入)+ packet 指针,**保住"开工从看板顶取"的队列可见性**(修正了"只注当前任务摘要"的原案);`rules/parallel-collab-rules.md`(write_set 不相交才并行 / 主 agent 唯一 integrator / 租约=🔨 经 taskctl)。

**验证(全部真机、主 agent 亲手复跑)**:selfcheck 全绿(含新增 5 例 harness 语义回归:沉默 reviewer 从放行变 HOLD / 缺 progress.json HOLD / PASS+PASS 唯一写入者落 e2e_verified / generate 保留 / 缺 verify 命令显式 FAIL);全新 M init 端到端 reconcile 0 errors 且五条守卫 wire 全部执行;taskctl 三拒绝路径 + 事件 before/after SHA 流水实测(非 hash chain,3.7.0 澄清);compiler 两次 md5 一致(确定性);drift 改契约即红、重生成即绿;hook top-N + 截断 + 统计行实测。

**Canary 待办(CreatorOS 侧,不在本 skill 仓)**:重 vendor `orchestrator/process/`(保住项目自己的 config)→ 用 taskctl 跑一周真实任务 → ingestion 模块迁入知识层 → 一个真实 T-xxx 用 Task Packet 派子代理。canary 不绿,新守卫不升级为新项目硬门。

## 3.3.0 — 2026-07-06,2026-07-10 重建(物理架构门 + backlog 健康 + 现网事实证据;v3.3 复盘选择性回流)

> **重建记录(2026-07-10)**:本版本曾于 07-06 完成并真机验证,但**未 commit 进 skills-manager git**,被 backup sync(`backup: 同步 Skills 库`)用旧快照整树覆盖、无痕丢失(工作树/HEAD/全历史均无残留)。今按会话内容精确重建并**立即 commit**。教训:canonical skill 的每次进化必须当轮 commit,否则 backup sync = 静默回滚器;这也是「Harness/进化链路 fail-closed」主张的最强实证。

**起因**:用户让另一 agent 基于 CreatorOS 深度使用体感写了一份《v3.3 优化设计》(提了 ~18 个新资产)。批判性复核发现:约 70% 是**重造 skill 里已有的**(binding/探索稿盖章/mock 退役/product-audit/验证证据/P0P1 禁令/codegraph --force-not-sync/OSS 调研 均已在),或**进口的 best-practice ceremony**。只回流 3 项真缺口,拒 1 项会倒退的,忽略其余。(那份 v3.3 自身用 P0/P1/P2 分阶段——违反本 skill 明文禁令——未继承;它也没先核实 SKILL.md 现状,正是它自己 §9.2 想治的"开工前不核实是否已存在"。)

**LAND(3 项)**:
- **物理架构层**(promote CreatorOS 已战功验证的 `boundary-scan.mjs` + `boundaries.config` + `SYSTEM_ARCHITECTURE`,非重造):逻辑阶段管"做什么",物理架构管"代码住哪 / 谁 import 谁 / 谁写库"。ratchet 棘轮(新违规 fail、已知债进 baseline 随重构消减)。新增 `process/boundary-scan.mjs`(加"无 config 优雅 no-op"守卫)+ `boundaries.config.example.json` + `templates/SYSTEM_ARCHITECTURE_TEMPLATE.md` + `rules/physical-architecture-rules.md` + `gates/02-architecture-boundary-gate.md`;挂 `reconcile.mjs` **ERROR-biased** sibling wire(像 orphan-scan,结构回归必拦)。**M/L 启用**(init 自动 scaffold + baseline),**S 免**(DEC-000 覆盖)。
- **backlog-health**(`process/backlog-health.mjs`):强制 skill 早已声明却没人遵守的"BACKLOG >15KB 就压缩"规则(实测某项目已 204KB、单行最长 5933 字)。>15KB warn / >30KB fail + 单行 + 已完成区膨胀;挂 `reconcile.mjs` **WARN-biased** wire(像 asset-check,台账膨胀是卫生债、不 block 无关工作)。
- **SPEC 现网事实证据**(治最高频坑"开工前不核实是否已存在"):`PRODUCT_SPEC`/`SERVICE_CONTRACT` 模板的「现成方案/OSS 调研」增补——凡"X 仓内已有 / X 无现成实现"断言必须附 `file:line` 或 codegraph 查询证据,空断言不通过;`spec-reviewer` 的 reinvent-wheel 维度加 Pass/Fail 锚点(缺证据≥CONCERNS)。补上了"gate 审合定位却不审是否已存在"的缺口。

**REJECT / 忽略(记下防重提)**:
- ⛔ **codegraph 刷新可配 + `sync` 示例**——会**倒退**:skill 已定 `index --force` + 新符号验鲜、**永不信 `codegraph sync`**(它谎报 up-to-date)。不动。
- ❌ 组件映射登记册 / design-token 策略 / docs-health(Diataxis/C4/ADR 强制 + 坏链扫描)/ UI-story 上 Storybook —— 进口 ceremony,无对应真坑;UI 状态集(loading/empty/error/real)已被 `product-integrity-rules` 覆盖;"复用现有组件"降为 gate 06 一句话即可。
- ❌ `AGENT_TASK_SPEC_TEMPLATE` —— 已被 `gates/13-tdd` + product-integrity 真数据验收 + `completion-rules` 覆盖,边际过小。

**验证(真机、防假绿;07-06 首验 + 07-10 重建后复验)**:selfcheck 绿;临时 M/S init 端到端 reconcile 绿(M 自动 scaffold 物理架构 + baseline、两条新 wire 执行,S 正确免);植入 R1 违规 → `boundary-scan` exit 1 精确报新违规 + reconcile ERROR 拦住;灌入 204KB BACKLOG → reconcile WARN 但不 block(exit 0)。

## 3.2.0 — 2026-07-02(开源深读回流:判例法 gate + 量规化评审 + 澄清标记)

**起因**:9 个代表性开源框架(spec-kit/superpowers/OpenSpec/BMAD/tdd-guard/metaswarm/conductor/GodModeSkill/gsd)由 4 个研究员并行深读,回流高杠杆低风险项;大项入上方 Roadmap。

- **gate 判例法**(源 superpowers 反合理化写作):_GATE_EVIDENCE 加奠基原则("绕过字面=违反本意;豁免只有 accepted-risk 一条通道");gates 13/15b/09 各加「借口对照表 + Red Flags」——针对洗绿/HARD 洗白/fixture 兜底/planned 无主等真实借口逐条驳斥,红旗收敛到单一动作。
- **spec-reviewer 量规化**(源 metaswarm rubrics):职责清单 → 六维度 Pass/Fail 锚点表 + 无效 finding 负面清单(无引文断言/无定位指控/感受式/建议冒充缺陷即废);新增 **scope-reduction 维度**(源 gsd 措辞黑名单:v1/简化版/先静态/stub/太复杂所以省略…——缩水永远 blocker);模糊形容词无量化即 finding(源 spec-kit analyze 词表);schema category 增 scope-reduction。
- **澄清标记**(源 spec-kit):`[NEEDS CLARIFICATION: 问题]` 内联钉在 FR 上,全文 ≤3 个、优先级 scope>安全>UX>技术;gate 01 加机器检查(grep 清零才可签核)。
- **其他**:scenario 加 Independent Test 字段(切片雏形);accepted-risk 自证三列(Violation/Why needed/Simpler alternative rejected,源 spec-kit Complexity Tracking);Scale Triage 加 stakes 探针(源 BMAD 一问式校准)+ **gate floor**(13/15b/14 任何类别不可裁,源 BMAD"缩放有下限");harness run.sh 加 preflight(prompt 文件/JSON 可解析/模型异构,秒 0 失败,源 conductor validate)。

## 3.1.1 — 2026-07-02(清旧 + 详细中文 README)

- 删除旧流程遗留:`examples/simple-saas`(v2 产物链)、`notes/EXTERNAL_SKILL_MAP.md`(引用不存在的 external 克隆)、`docs/`(2026-06-26 历史设计/计划文档)、两份历史 `_eval_report`;顺手清掉 reconcile 报错信息里的 `docs/decisions/0005` 悬空引用。
- `README.md` 重写为**详细中文版**:五阶段逐段详解 + 三条贯穿链路(确定性守护/状态与追溯/进化闭环)+ 关键纪律速查表 + 目录地图 + 维护须知。skill 执行内容保持英文(SKILL.md 及各文件不翻译)。

## 3.1.0 — 2026-07-02(删旧 + 双 eval 驱动的 27 项修复)

**起因**:用户指令移除旧流程;两个 eval agent 实测(E1:S 类冷启动全程 dry-run,7/10;E2:「UI 空头支票」攻击测试 + 引用全审)共报 27 项。

- **移除**:workflows/00-17(18 文件)+ 6 个无引用旧 gate + FUNCTION_OUTLINE 模板(内容已并入 PRODUCT_SPEC);gates 08/09 保留并接入 v3-4 片级门。
- **机制加固(E2 攻击结论:判定学是纸的 → 变真)**:15b 增证据规则(feasible 须来源枚举+可验证证据,泛指=fail)、HARD 洗白封堵(须候选解法+归属+期限;无合法数据源不得判 HARD)、来源与 FR 措辞冲突→A 级确认;gate 06 增 planned 须挂 HARD/BACKLOG owner;reconcile 增 passed-without-gate laundering 检查 + v3 时序守卫(契约未过门不得动 DESIGN/BUILD)。
- **PLANNED 状态**:矩阵新增 PLANNED(PLAN 期已确认未建,免 DEC 链),orphan-scan 识别,gate 14 查清零——解决 E1 高危「plan 登记必挂扫描」。
- **模板 v3 化**:PRODUCT_SPEC 补 flow/model/IA 三章节 + 阶段 id 改 v3;SERVICE_CONTRACT 增可行性附录表(7 列含冷启动);状态机 Invalidation Rules 重写为 v3 变更源×级联矩阵 + skip 状态约定(accepted-risk+notes);mock-data-rules 重写为 v3 语义;cross-audit/bootstrap/SKILL 旧阶段话术清零。
- **init 增强**:updated_at 打日期、生成最小 reconcile.config.json、从 AGENTS_TEMPLATE 生成项目 AGENTS.md(消除首跑 2 WARN 与 BACKLOG 悬空引用)。

## 3.0.0 — 2026-07-02(流程收缩:18 阶段 → 5 阶段,垂直切片默认化)

**起因**:实战反馈两条——流程太长太复杂;UI 先行会画出数据链路支撑不了的功能("真 UI 做出来,功能接不上线")。

- **新主流程 5 阶段**(`workflows/v3-1..5`):PLAN(一份章节化 spec,吸收旧 00-06)① → CONTRACT(契约+**逐 FR 数据链路可行性判定** feasible/HARD/cut,吸收旧 13/14/15 并前移)② = scope envelope → DESIGN(受契约约束,吸收旧 07/08/09)→ BUILD(垂直切片循环,吸收旧 10/11/12/16:每片 契约细化→TDD→接真→回显 e2e→片级走查,**数据第一天就是真的**)→ SHIP(旧 17)③。用户确认 14 次 → **3 次**。
- **"No API, no UI"**:页面 binding 表里每个真交互必须指向契约既有操作,悬空即 fail(gate 06 新检查);UI 探索模式改为显式 opt-in,探索稿标注且不得进 BUILD。
- mock 不再是独立阶段:降级为空态/错误态薄夹具,退役账应接近空。
- manifest 模板重写为 5 阶段(reconcile 通用解析天然兼容);stage-router/gates 06+15b/init/selfcheck 全部 v3 化;旧 18 阶段文件原位保留为 L 类展开细则参考。
- 交互式与自治统一形状:BUILD 的手动循环 = harness per-vertical 的有人值守版。

## 2.0.0 — 2026-07-02(评审驱动大修 + T-048 回流 + 脚手架化)

**起因**:22-agent 多视角评审(16 findings 对抗核实)+ CreatorOS T-048 复盘(394 缺陷/六根因)。

- **P0 同步管线**:确诊 skills-manager.app 以 Workbase lab 为源覆写 central;找回被吞的 2 个修复提交 + 83 个引擎文件 + 22 个文件的接线回滚;新增 `tools/sync-to-lab.sh`(双落点镜像)。
- **P1 消灭虚假 enforcement**:`templates/hooks/backlog-guard.sh`(PreToolUse 按编辑后状态拦未过审开工);spec-reviewer「执行契约」(mmx→claude→同模型降级留痕);Startup vendor `process/`。
- **P2 流程伸缩**:Scale Triage(S/M/L 一条 DEC);Contract-First(契约草案 ≤stage 10,mock 派生);Execution Forms(Autonomous Mode 入口)。
- **P3 一致性**:registry 指针化(local:/ref:);「现成方案/OSS 调研」节入模板;reconcile CHANGE_IMPACT 条件化+staleness 诚实化;模板示例互洽且 scan-passing;selftest 夹具;defer 语义精确化;三态存储职责划清。
- **T-048 六根因接线**:Mock Retirement ledger(模板→gate 08 有账→gate 14 销账);`prompts/product-audit.md` 审计节拍;UI 负债台账+规划中标识(gate 09);非 fixture 实体验收+写读回环(gate 10);跨页词表单一来源;主线真机走查(wf17+gate 14);自治模式每 ~10 任务插审计步。
- **脚手架化**:`tools/init-project.sh`(一键起项目:控制面+看板+hooks+vendor+首跑 reconcile,幂等);`tools/selfcheck.sh`(skill 完整性绊线);`workflows/_COMMON.md` 骨架抽取(消灭 ~87% 冲压重复);VERSION/CHANGELOG。

## 1.x — 2026-06(此前的演进,择要)

- 复用引擎②+进化引擎④(`5f5cd0a3`):RUN_EVENTS→lessons/资产,verified 门,防腐三守卫,antiCheck。
- C 源蒸馏 MOD-003~007 入库(`45ad98e9`);Know-share 复盘三教训(`f3bb1bb4`)。
- 可执行控制面 v2:reconcile/orphan-scan、gate 证据政策、状态机 Executable Enforcement。
- eval 驱动修复:workflow→gate→template 链接、编号映射、description 触发词(`fca7b714`,曾被同步吞掉后找回)。

## Roadmap(候选回流项,来自 9 个开源框架深读,2026-07-02)

按 ROI 排序,来源报告存 study 目录与本会话记录:

1. **stub-scan.mjs**(源 get-shit-done goal-backward verifier):切片定义时从 FR 倒推 3-5 条 truths;脚本查 stub 特征串(placeholder/coming soon/not yet implemented + 硬编码空数据流向渲染)+ key_links 断线 + 产物降格(min_lines/exports)——把"矩阵行翻 OK 靠自报"的缝隙补上,product-audit 与 SHIP 前跑,fail-closed。
2. **SPEC delta 变更协议**(源 OpenSpec):签核后 PRODUCT_SPEC 修改走 `changes/<id>/spec-delta.md`(ADDED/MODIFIED/REMOVED,主键用我们的稳定 ID 而非标题);delta 条目机械展开为 Invalidation 级联;`spec-delta-check.mjs` 校验不过不许合并回正文;归档 `changes/archive/`。
3. **运行时信号进 backlog-guard**(源 tdd-guard):verify 后写 `last-verify.json`(pass/cmd/git_head);任务 🔨→✅ 时 guard 要求存在新鲜绿证据,否则 exit 2;SessionStart 清瞬态;完工检查 fail-closed、开工检查保持 fail-open;配 permissions deny 防证据文件被伪造与 Bash 旁路改看板。
4. **review-verify.mjs 反幻觉核验**(源 GodModeSkill converge):finding 的 where 升级为 {file, quote},脚本对被审 spec 做空白容忍匹配,quote 不存在标 verified:false 且不得单独构成 FAIL。
5. **spec-clarify 提问引擎**(源 spec-kit clarify):8 类模糊度扫描 + Impact×Uncertainty 排序 + 一次一问 + agent 先给推荐项 + 每答即融合落盘。
6. **verifier 严格 JSON 裁决**(源 conductor):run.sh 的 EVAL_VERDICT token-grep 升级为单行 JSON schema 解析,解析失败=HOLD。
7. **教训检索加 files 轴**(源 metaswarm bd prime):LESSON_LEDGER 加 affected-globs 列,stage-router 6.5 按切片 file scope 匹配;教训加 hits 计数与 never-fired 剪枝互补。
8. **高危 spec 三票制**(源 GodModeSkill quorum):数据归属/迁移类 spec 与 L3+ 无人值守 cadence review 升级为 minimax/claude-cross/claude-fresh 三 lineage 计票,disabled/missing 语义分离。
9. 小件:上下文桥接+35/25 阈值注警与 [checkpoint] 心跳(gsd→harness)、HALT 结构化断点(conductor)、失败分层重试(conductor)、评审运维日志+错误十分类(metaswarm)、token 级 UI 契约(BMAD DESIGN.md)、压力场景 eval 方法(superpowers writing-skills)。
