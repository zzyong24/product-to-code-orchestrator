# 项目协作说明

- 产品方向：`<path-to-product-spec>`；用户用语：`<path-to-PRODUCT_VOCABULARY.md>`；任务顺序：`BACKLOG.md`。
- 每个 BUILD 任务运行 `orchestrator/process/context-plan.mjs`；按 read_root 读取项目固定规则包的 required_reads，按项目根读取 required_project_reads，再查看当前说明与相关代码。
- 仅派发、并行或自治 执行使用 `context-compile.mjs <T-id>`；主会话负责分配无冲突范围和串行整合。
- 新项目为 `buildout`：实现、聚焦验证、真实集成、验收。稳定后经用户决定用 `delivery-phase.mjs promote` 进入 `maintenance`；普通任务不预建审核、研究或追溯材料。
- 授权沿用当前用户决定；未决的重要选择按 read_root 中的 `workflows/_COMMON.md` 处理。范围内持续完成，不在阶段边界重复询问。
- 实现前用同一规则包的 `rules/global-rules.md` 最小实现阶梯。保持数据所有权和真实路径，模拟结果不能冒充交付。
- 验证当前改动和项目必需检查；`reconcile --profile quick --read-only` 仅核对控制面，不能代替完整验证。新变化、失败或未决风险才扩大或重复验证。
- 保留无关修改；推送、部署与不可逆动作核对已有授权。研究门只暂停受影响任务。
- 说明使用中文；路径、命令、字段、状态枚举与 ID 保持原样。用户文案以产品词表为准。
