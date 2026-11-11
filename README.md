<p align="center">
  <img src="assets/readme/hero.png" width="100%" alt="月明宇航员将产品想法整理为契约、代码与验收的概念插画">
</p>

<h1 align="center">月明·产品开发编排</h1>

<p align="center">把产品想法推进为可运行、可验证的代码，只加载当前任务需要的规则。</p>

<p align="center">
  <a href="SKILL.md">Skill 使用说明</a> ·
  <a href="docs/user-guide.zh-CN.md">实操教程</a> ·
  <a href="docs/skill-file-map.zh-CN.md">文件地图</a> ·
  <a href="evals/evals.json">评估用例</a>
</p>

---

这是一个供编码 Agent 使用的渐进式产品开发 Skill。它把产品范围、接口与数据合同、设计、实现和验收串起来，并用项目内的脚本检查可机械判断的状态和证据。技术名称保留为 `product-to-code-orchestrator`，与既有 Skill 调用、安装目录及仓库名称一致。

适合从自然语言需求启动小型产品，或在已有项目中持续实现已确认的范围。单点代码修改通常不需要启动完整流程。顶部插画表达工作方式，不是软件截图或验收证据。

## 能做什么

- **按需读取**：根据阶段、任务和配置返回需要阅读的资料路径，避免每次注入整套规则。
- **轻量起步**：新项目以 `buildout` 推进实现和验收；稳定后由用户决定进入 `maintenance`，再启用适用的正式审核。
- **规则随项目固定**：运行时和带内容哈希的规则包一起进入产品目录，搬迁后仍能定位材料。
- **检查与执行分开**：快速只读审计检查状态、收据和漂移；完整检查执行项目配置的验证命令，并报告预算、耗时与失败。
- **保护既有项目**：更新保留配置和记录，修改过的受管文件需要核对迁移候选。

```text
产品目标 → 最小合同 → 结构草图 → 实现 → 聚焦测试 → 真实集成 → 验收
```

## 安装

需要 Git、Bash 和 Node.js。当前验证环境为 macOS、Node.js 26；普通初始化不需要安装 npm 依赖。独立的 `process/harness/` 串行运行器还需要 Claude CLI；宿主是否支持 hook 或并行执行，以实际宿主为准。

Codex 示例：

```bash
git clone https://github.com/zzyong24/product-to-code-orchestrator.git \
  ~/.codex/skills/product-to-code-orchestrator
```

Claude Code 示例：

```bash
git clone https://github.com/zzyong24/product-to-code-orchestrator.git \
  ~/.claude/skills/product-to-code-orchestrator
```

已有同名目录时先核对来源和本地改动。其他宿主可把仓库放到其支持的 Skill 目录，或读取仓库根部的 [SKILL.md](SKILL.md)。这不代表所有宿主的生命周期钩子都已验证兼容。

## 使用

在支持 Skill 的 Agent 中描述目标，例如：

> 使用 $product-to-code-orchestrator，在指定产品目录实现一个本地日期待办工具。先确认现有代码与产品范围，再完成实现和验证。

> 使用这个 Skill 恢复已有项目，从依赖就绪的任务继续，复用已有配置。

Agent 先定位产品目录、当前阶段与授权，再读取需要的材料。Skill 本身不提供模型账号或 API 服务；模型与外部工具由宿主提供。项目配置的完整验证命令可能使用网络或第三方服务。

也可从 Skill 仓库根目录手动初始化：

```bash
bash tools/init-project.sh /path/to/my-product \
  --triage S --topology single --name MyProduct
```

`S|M|L` 根据实际复杂度选择；`single|multi` 根据交付关系选择。`multi` 同时提供 `--program-id`。产品目录与 Skill 仓库目录分开；完整步骤见[日期待办实操教程](docs/user-guide.zh-CN.md)。

初始化生成看板、Agent 入口、阶段清单、决策记录、项目运行时与固定规则包。产品总纲在 PLAN 阶段形成。M/L 类项目另有模块知识与结构材料；休眠的研究、审核、授权等条件材料不会预先生成空表。

## 检查与更新

在产品项目根目录运行：

```bash
node orchestrator/process/context-plan.mjs --root . --json
node orchestrator/process/project-doctor.mjs --root . --json
node orchestrator/process/reconcile.mjs --profile quick --read-only --concise
```

第一条输出读取计划，第二条诊断迁移缺口，第三条执行控制面审计。快速通过不代表项目 lessons、真实业务旅程或跨项目实时验证已经通过。

完整检查执行项目真实命令，需要声明执行预算，并准备合适的数据、用户目录与网络隔离：

```bash
node orchestrator/process/reconcile.mjs --profile full
```

更新既有项目时，从 Skill 仓库根目录运行：

```bash
bash tools/init-project.sh /path/to/my-product --update
```

初始化中断、受管文件修改、旧钩子和配置缺失会给出具体诊断。核对候选与保留的备份后再迁移，详见[过程层说明](process/README.md)。GitHub CI 可用 `--ci github` 显式接入；模板仍需按项目工具链调整，远端 required checks 需要另外核实。

## 项目事实放在哪里

| 文件 | 职责 |
| --- | --- |
| `PRODUCT_SPEC.md` | 产品方向与确认范围 |
| `PRODUCT_VOCABULARY.md` | 用户可见术语和状态文案 |
| `BACKLOG.md` | 任务顺序与当前状态 |
| `orchestrator/ARTIFACT_MANIFEST.yaml` | 阶段状态 |
| `orchestrator/DECISION_LOG.md` | 重要取舍和用户决策 |
| `FRONTEND_VALIDATION_REPORT.md` | UI 风险触发时的真实旅程验证 |

源码中，`rules/`、`workflows/` 和 `gates/` 维护执行边界；`process/` 提供机械检查；`templates/` 提供按需材料；`decisions/` 保存设计依据和复用参考。详细归属见[文件地图](docs/skill-file-map.zh-CN.md)。

## 验证与限制

维护者在 Skill 仓库根目录执行：

```bash
bash tools/selfcheck.sh
```

v3.30.0 已通过 349 项源码测试，以及独立的临时目录初始化、迁移和失败恢复验证。此次验证不等于所有产品、操作系统或 Agent 宿主都已验收，也没有测量速度或成功率提升。

- 收据绑定证据内容；模拟数据和模型自报不能代替真实业务验收。
- hook 覆盖依赖宿主，直接 shell/IDE 写入可能绕过即时检查。
- 完整 lesson 执行器目前依赖 POSIX 进程组，进程终止机制不构成安全沙箱。
- 产品范围、不可逆数据动作、部署和发布，按当前用户授权与实际影响处理。

设计与验证依据见 [Astra 审计记录](decisions/astra-scaffold-audit.md)、[运行整改记录](docs/scaffold-audit.zh-CN.md)。执行预算规则见[超时预算与恢复](rules/timeout-budget-rules.md)。Agent 产品内核选型见[初始化架构设计](prompts/agent-architecture-initialization.md)。

## 维护与许可

本仓库是独立分发副本，修改先回维护源验证，再同步发布；不携带用户项目、凭据、缓存或 `output/` 运行产物。问题与建议可通过本仓库 Issues 提交。版本见 [VERSION](VERSION)，历史变更见 [CHANGELOG.md](CHANGELOG.md)。

源码公开可读；当前未授予通用开源许可。版权与使用边界见 [LICENSE](LICENSE)，资产卡另有声明时遵循其原始声明。公开仓库不自动授予第三方再分发或商业使用许可。
