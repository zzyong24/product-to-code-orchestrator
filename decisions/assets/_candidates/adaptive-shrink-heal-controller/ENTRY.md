---
id: adaptive-shrink-heal-controller
kind: module
title: 自适应收缩与恢复
problem_tag: [resilience, throttling, adaptive-batching]
when_to_use: 容量上限未知或会变化，且容量拒绝确实能通过缩小批量缓解。
when_not_to_use: 上限已知、错误与大小无关，或需要真正的配额/令牌桶限流时。
keywords: [adaptive-batching, multiplicative-decrease, backoff, heal, safety-factor, AIMD, shrink-on-miss, state-machine, rate-adaptation, self-tuning]
status: candidate
verified: false
provenance:
  source: C
  origin_repo: gbrain (github.com/garrytan/gbrain)
  origin_commit: d71fcf6f6515c320b179f232a07d9b6f524746d8
  content_hash: rewrite
license: MIT
files:
  - files/shrink-heal-controller.ts
example: ./example/example.test.ts
---

# 自适应收缩与恢复

每个键独立维护系数。失败时按 `shrinkRatio` 乘法收缩到不低于 `floor` 并清空成功计数；连续成功达到 `healAfter` 才按 `healRatio` 恢复，最高为 `defaultFactor`。

调用方每轮由 `floor(maxBudget * factor)` 推导具体容量，避免固定批量漂移。示例默认值为 `0.8 / 0.05 / 0.5 / 1.5 / 10`，应按实际约束配置，不能把鉴权或服务错误误判为超大批次。

测试覆盖收缩、下限、连续成功恢复、重置、键隔离和配置校验；浮点断言使用容差。

## 来源与验证

来源、提交、许可证与候选状态见元数据。运行 `node --test --experimental-strip-types example/example.test.ts` 验证本地示例；示例通过不等于目标产品验收。
