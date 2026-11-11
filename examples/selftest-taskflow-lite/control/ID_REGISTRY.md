# ID Registry — selftest fixture (taskflow-lite)

Self-test fixture for `orphan-scan.mjs`. Carries the worked failure described in
`gates/consistency-gates.md`: the product spec requires "create tasks" (`FR-create`),
but the service contract defines only list and update. Expected scan verdict: **exit 1**,
one release-critical BROKEN CHAIN on `FR-create`.

Run from the skill root:

```bash
node process/orphan-scan.mjs --control-dir examples/selftest-taskflow-lite/control
```

```id-registry
| ID | Type | Defined In | Source IDs |
| --- | --- | --- | --- |
| FR-create | requirement | PRODUCT_SPEC.md | NONE |
| FR-list | requirement | PRODUCT_SPEC.md | NONE |
| FR-update | requirement | PRODUCT_SPEC.md | NONE |
| FLOW-manage | flow | BUSINESS_FLOW.md | FR-list, FR-update |
| PAGE-tasks | page | PAGE_SPEC.md | FLOW-manage |
| API-list | api | SERVICE_CONTRACT.md | FR-list |
| API-update | api | SERVICE_CONTRACT.md | FR-update |
| TC-LIST-1..2 | test | api.test.js | API-list |
| TC-UPD-1 | test | api.test.js | API-update |
```
