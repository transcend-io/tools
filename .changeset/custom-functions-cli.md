---
'@transcend-io/cli': minor
---

Add `transcend custom-functions push` (manifest-driven create/update of custom function code revisions with change detection, draft + promote, and dry-run support) and `transcend custom-functions list`, designed to run from client CI. Code is signed against the Sombra customer ingress (pass `--sombraAuth` when self-hosting Sombra). Manifest entries can pin a custom function `id` (required when names are not unique), and `push --updateManifest` writes assigned IDs back into the manifest while preserving comments and `<<parameters.x>>` placeholders.

Manifest entries can also define `test-payloads` — a list of JSON payload files, each with an optional `payload-type` so DSR functions cover both their default (`DATA_POINT`) and enricher (`REQUEST_ENRICHER`) exports on every push (`test-payload` remains as single-payload shorthand). The freshly signed code is test-run with every payload via the `runCustomFunction` mutation before pushing; all must pass or the function is rejected with each failing payload's reason and execution logs (exit code 1). A warning is printed when a DSR entry only covers one export. Use `--skipTests` to bypass testing.

New DSR functions no longer require a `data-silo-id`: the DSR integration (a `customFunction`-catalog data silo) is created automatically before the test run, the function is created and linked on a passing test (the silo is rolled back on failure), and `--updateManifest` writes both the function `id` and the `data-silo-id` back into the manifest. DSR test payloads get `extras.dataSilo` injected from the resolved silo automatically.
