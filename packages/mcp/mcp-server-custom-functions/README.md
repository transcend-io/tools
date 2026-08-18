# @transcend-io/mcp-server-custom-functions

MCP tools for authoring, versioning, and testing Transcend Custom Functions from plaintext
TypeScript. Code is signed through Sombra customer ingress before it is sent to GraphQL; signed
code is never exposed in tool responses.

## Setup

```bash
npm install -g @transcend-io/mcp-server-custom-functions
```

Configure OAuth or `TRANSCEND_API_KEY` as described in the
[MCP setup guide](../README.md), then configure the Sombra gateway that will execute the function:

```bash
export SOMBRA_URL=https://your-customer-ingress.example.com
export SOMBRA_CUSTOMER_KEY=your-customer-ingress-key
```

The credentials need `ViewDataMap`, `ManageDataMap`, `ConnectDataSilos`, `ViewEmailTemplates`,
and `ExecuteRules`. `SOMBRA_URL` and `SOMBRA_CUSTOMER_KEY` must refer to the same single-tenant
gateway used by the target data silo or GENERAL function. Customers with multiple STS Sombra
gateways can run separate server configurations for each URL/key pair.

## Tools

| Tool                               | Purpose                                                                 |
| ---------------------------------- | ----------------------------------------------------------------------- |
| `custom_functions_upsert`          | Sign plaintext code and create or update a Custom Function              |
| `custom_functions_list`            | List functions, lifecycle state, gateway, and version metadata          |
| `custom_functions_get_code`        | Unwrap the readable version to plaintext for editing                    |
| `custom_functions_promote_version` | Promote a pending draft to active                                       |
| `custom_functions_test_run`        | Test unsaved plaintext or a stored function, and mark it tested on pass |

The normal agent loop is:

```text
upsert (omit sombraId / dataSiloId, unique name)
  → test_run({ id })
  → upsert (draft, promote false)
  → promote_version
```

Successful responses include a `nextStep` string naming the following tool call. Or one-shot
create-and-test with `custom_functions_upsert` `testPayloads` (pre-persist gating; Activity is
not bound).

Creating a DSR function without `dataSiloId` also creates a `customFunction` data silo on the
resolved Sombra gateway. Pass an existing Custom Function silo ID only when you already have one
(`CUSTOM_FUNCTION` strategy; `inventory_list_data_silos` with
`customSiloConnectionStrategy=CUSTOM_FUNCTION`). Creating a GENERAL function (and a new DSR
integration) omits `sombraId` unless the tool errors with a list of gateway IDs; never pass
`sombraId` on DSR create. Use a unique `name` so `custom_functions_list` `text` can find the row.

DSR code must expose callable default and `enricher` exports. GENERAL code must expose a callable
default export.

`custom_functions_test_run` with `id` and no `code` executes the readable version (active, else
latest draft). DSR stored runs bind Activity. GENERAL stored runs replay the saved JWT pair the
same way the dashboard Test button sends a code source (GraphQL has no stored-id GENERAL path).
`successfulTestRun` is persisted on **save**, matching the dashboard: pass `testPayloads` on
upsert, or upsert a draft after a passing test. Testing an already-active version does not flip
the badge. `type` is inferred from the stored function. Pass `code` to trial unsaved plaintext; DSR unsaved
trials need `dataSiloId` from upsert. Combine `id` with `code` to trial unsaved edits without
binding Activity. Omit `payload` unless you need a specific body. GENERAL payloads default
to `{ "message": "hello world!" }` (the backend may add `coreIdentifier`). DSR uses a stub ACCESS
payload and injects the silo id — do not hand-build `extras`. Responses include `passed`,
`exitCode`, `logs`, `error`, and `timeMs`.

`custom_functions_get_code` is read-only but sensitive because its `userDefinedEnv` response may
contain secrets. It returns `version.successfulTestRun`. The current API exposes the active
version, or the latest draft when there is no active version; arbitrary historic versions cannot
be unwrapped through this tool.

See the [Custom Functions documentation](https://docs.transcend.io/docs/integrations/custom-functions).
