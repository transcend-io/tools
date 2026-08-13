---
'@transcend-io/sdk': minor
'@transcend-io/privacy-types': minor
---

`@transcend-io/privacy-types` gains custom function enums (`CustomFunctionType`, `CustomFunctionLifecycleState`, `CustomFunctionVersionLifecycleState`, `CustomFunctionPayloadType`), mirroring the backend's canonical values.

Add custom function sync support. The SDK gains a customer-ingress code signing helper (`signCustomFunctionCode`, calling Sombra's `/v1/custom/sign` route with bearer authentication) and typed custom function fetch/diff/sync helpers (`fetchAllCustomFunctions`, `syncCustomFunction`). The custom function type/lifecycle/payload-type unions come from the new `@transcend-io/privacy-types` enums, and JWT payload decoding uses `jsonwebtoken`. Existing custom functions are matched by `id` when provided, falling back to exact name, with an error on ambiguous names.

`createSombraGotInstance` gains a `sombraId` option to connect to a specific (non-primary) Sombra gateway by ID, resolved from the organization's gateway list.

Creating a GENERAL function without a pinned gateway resolves the organization's primary Sombra (the backend requires an explicit `sombraId` for GENERAL creates); DSR creates never send `sombraId` or `setActive` — the linked data silo dictates the gateway, and DSR functions are always created active (a warning is logged when `promote` is disabled for a DSR create).

Also adds a test-before-promote flow: `runCustomFunctionTest` test-runs freshly signed code via the `runCustomFunction` mutation (pre-signed JWT pair, `isCustomFunctionTestRun: true`) and reports a `passed` boolean; `syncCustomFunction` accepts a `testPayloads` list (each payload optionally tagged with a `payloadType`, so DSR functions can cover both the default `DATA_POINT` export and the `REQUEST_ENRICHER` enricher export in one push). Every payload runs and all must pass — any failure rejects the push with a new `test-failed` outcome, with per-payload `testResults` (error and logs) attached.

New DSR functions get their DSR integration created automatically: when a DSR config has no `dataSiloId` and no existing function matches, `syncCustomFunction` creates a `customFunction`-catalog data silo shell (`createCustomFunctionDataSilo`), tests the signed code against it (DSR test payloads always get `extras.dataSilo` injected from the resolved silo, with `title`/`description`/`link` defaulted to satisfy the backend's webhook payload codec), then creates and links the function on a passing test — rolling the silo back (`deleteDataSilo`) on failure. Sync results now report `dataSiloId` / `createdDataSilo`.

`makeGraphQLRequest` no longer retries backend payload validation failures (`Failed to decode codec`) — they are deterministic, and retrying repeated the full codec error output.
