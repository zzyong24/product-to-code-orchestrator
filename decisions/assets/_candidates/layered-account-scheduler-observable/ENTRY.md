---
id: layered-account-scheduler-observable
kind: pattern
title: 可观测的分层上游选择
problem_tag: [load-balancing, routing, observability]
when_to_use: 请求同时需要会话连续性、负载判断和失败排除，单一选择方法已不足。
when_not_to_use: 单上游、简单轮询足够、无需会话绑定，或严格公平配额需要确定性队列时。
keywords: [scheduler, sticky-session, ewma, load-aware, round-robin, failover, decision-log, account-pool, observability, layered-strategy]
status: candidate
verified: false
provenance:
  source: C
  origin_repo: https://github.com/Wei-Shaw/sub2api.git
  origin_commit: 85a3b122545a6c914704f716a612aea00c3d7ecd
  content_hash: rewrite
license: LGPL-3.0
---

# 可观测的分层上游选择

这是来源为 LGPL-3.0 的方法卡，没有随附代码或可运行示例。参考概念时保留来源；是否受许可证约束取决于实际复用内容，不能仅凭“重写”断言不受约束。

按明确优先级尝试：已有续传令牌绑定 → 健康会话绑定 → 负载选择并建立绑定 → 符合约束的兜底。失败排除集合贯穿每一层，绑定命中也不能返回已失败上游。

负载可使用错误率和首字延迟的 EWMA，参数按实际流量校准；它不等于硬配额，也不会在完全没有新样本时自动证明上游恢复。每次返回所选账户及 `ScheduleDecision { Layer, Hit, LatencyMs }`，便于查明哪个策略在起作用。

多副本需要一致的绑定存储；只有存在相应需求才增加层级。该卡仍为候选，不能把方法描述当成生产验证。

## 来源与验证

来源、提交、许可证与候选状态见元数据。
