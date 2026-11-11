# Traceability Matrix — selftest fixture (taskflow-lite)

The `FR-create` row is the planted break: status `OK` (release-critical) with no realizing
op and no test. The downstream→upstream check alone would pass (no orphan APIs exist);
only the upstream→downstream scan exposes it. Expected: release-critical BROKEN CHAIN, exit 1.

```traceability
| Product | Flow | Entity | Page | API | Test | Status |
| --- | --- | --- | --- | --- | --- | --- |
| FR-list | FLOW-manage | NONE | PAGE-tasks | API-list | TC-LIST-1..2 | OK |
| FR-update | FLOW-manage | NONE | PAGE-tasks | API-update | TC-UPD-1 | OK |
| FR-create | NONE | NONE | NONE | NONE | NONE | OK |
```
