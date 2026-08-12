---
'@transcend-io/sdk': minor
---

Add custom function sync support. The SDK gains a customer-ingress code signing helper (`signCustomFunctionCode`, calling Sombra's `/v1/custom/sign` route with bearer authentication), a Sombra gateway URL resolver (`resolveSombraCustomerUrl`), and typed custom function fetch/diff/sync helpers (`fetchAllCustomFunctions`, `syncCustomFunction`). Existing custom functions are matched by `id` when provided, falling back to exact name, with an error on ambiguous names.

Also adds a test-before-promote flow: `runCustomFunctionTest` test-runs freshly signed code via the `runCustomFunction` mutation (pre-signed JWT pair, `isCustomFunctionTestRun: true`) and reports a `passed` boolean; `syncCustomFunction` accepts `testPayload` / `testPayloadType` options and rejects the push with a new `test-failed` outcome (including the full `testResult` with error and logs) when the test fails.

New DSR functions get their DSR integration created automatically: when a DSR config has no `dataSiloId` and no existing function matches, `syncCustomFunction` creates a `customFunction`-catalog data silo shell (`createCustomFunctionDataSilo`), tests the signed code against it (DSR test payloads always get `extras.dataSilo` injected from the resolved silo), then creates and links the function on a passing test — rolling the silo back (`deleteDataSilo`) on failure. Sync results now report `dataSiloId` / `createdDataSilo`.
