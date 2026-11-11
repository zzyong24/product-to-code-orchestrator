---
id: ndjson-stream-dedup
kind: module
title: NDJSON 流解析与去重
problem_tag: [streaming, parsing]
when_to_use: 逐行 JSON 跨传输块拆分，并可能同时出现增量文字和最终整段文字。
when_not_to_use: 单个多行 JSON 文档、普通请求响应，或 SDK 已经提供正确去重流时。
keywords: [ndjson, stream-json, sse, dedup, state-machine, stream-accumulator, child-process, text-delta, line-buffering, llm-streaming]
status: candidate
verified: false
provenance:
  source: C
  origin_repo: html-anything
  origin_commit: 0f4a5820a2ee5012b334f57147928fa061c76032
  content_hash: rewrite
license: Apache-2.0
files:
  - files/ndjson-stream-parser.ts
example: ./example/example.test.ts
---

# NDJSON 流解析与去重

跨读取缓存未完整的一行，遇到换行才解析，结束时 `flush()` 处理尾部。每个解析器持有自己的 `sawStreamEventText`：收到文字增量后，不再重复输出最终 assistant 正文；没有增量时保留最终正文作为回退。

使用 `createStreamAccumulator()` 的 `push` 和 `flush` 接收输出事件。按真实协议适配 `system/stream_event/assistant/result` 分支；不能把这一轮去重策略无条件应用到不同事件协议。

测试覆盖任意分块、顺序、重复正文、回退、实例隔离、元信息、噪声与尾行。

## 来源与验证

来源、提交、许可证与候选状态见元数据。运行 `node --test --experimental-strip-types example/example.test.ts` 验证本地示例；示例通过不等于目标产品验收。
