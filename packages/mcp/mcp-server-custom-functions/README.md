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

The credentials need `ViewCustomFunction`, `ManageCustomFunction`, `ManageSombraRootKeys`,
`ConnectDataSilos`, and `ManageAccessControl`. `SOMBRA_URL` and
`SOMBRA_CUSTOMER_KEY` must refer to the same single-tenant gateway used by the target data silo
or GENERAL function. Customers with multiple STS Sombra gateways can run separate server
configurations for each URL/key pair.

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
upsert (omit sombraId / dataSiloId, unique name, envVarNames for needed secrets)
  → user fills Environment Variable values in the dashboard
  → test_run({ id })
  → upsert (draft, promote false)  // preserves dashboard env values
  → promote_version
```

Do **not** pass secret values through MCP. Pass `envVarNames` (e.g. `["API_KEY"]`) to create
Environment Variable placeholders (signed as `${API_KEY}` until the user fills them in the
dashboard). Use `environmentVariables` with `key`, `isSecret`, and optional `replaceSecret` when
you need explicit secret vs plain classification (recommended when names do not match credential
heuristics). The user replaces secret values in the dashboard.
Updates keep stored secret values and only add missing names from `envVarNames`.

Successful responses include a `nextStep` string naming the following tool call. Or one-shot
create-and-test with `custom_functions_upsert` `testPayloads` (sets `successfulTestRun` if they
pass; failed tests never block save; Activity is not bound).

Creating a DSR function without `dataSiloId` also creates a `customFunction` data silo on the
resolved Sombra gateway. Pass an existing Custom Function silo ID only when it is still
`NOT_CONFIGURED` (one DSR function per silo; `CONNECTED` silos reject attach). Creating a
GENERAL function (and a new DSR integration) omits `sombraId` unless the tool errors with a
list of gateway IDs; never pass `sombraId` on DSR create. Use a unique `name` so
`custom_functions_list` `text` can find the row. On update, omit `code` to keep stored code
when only changing env names, hosts, or other metadata.

`custom_functions_upsert` returns `envVarNames` from a post-write unwrap of the readable
version (pending draft if any, else active), not from the request echo. When a pending draft
exists, `custom_functions_get_code` prefers that draft so recent env scaffolding is visible
before promote.

DSR code must expose callable default and `enricher` exports. GENERAL code must expose a callable
default export.

`custom_functions_test_run` with `id` and no `code` executes the readable version (active, else
latest draft). DSR stored runs bind Activity. GENERAL stored runs replay the saved JWT pair the
same way the dashboard Test button sends a code source (GraphQL has no stored-id GENERAL path).
Save and promote do **not** require a passing test. `successfulTestRun` is still set on save when
tests pass: pass `testPayloads` on upsert, or upsert a draft after a passing test. Testing an
already-active version does not flip the badge. `type` is inferred from the stored function.
Pass `code` to trial unsaved plaintext; DSR unsaved trials need `dataSiloId` from upsert. Combine
`id` with `code` to trial unsaved edits without binding Activity. Omit `payload` unless you need
a specific body. GENERAL payloads default to `{ "message": "hello world!" }` (the backend may add
`coreIdentifier`). DSR uses a stub ACCESS payload and injects the silo id — do not hand-build
`extras`. Responses include `passed`, `exitCode`, `logs`, `error`, and `timeMs`.

`custom_functions_get_code` returns plaintext code and runtime context with environment-variable
**names** only (values are redacted as `[set in dashboard]` or `[not set - fill in dashboard]`).
It also returns `unsetEnvVarNames` when any placeholders still need dashboard values. Set secrets in the Admin Dashboard Environment Variables
tab. It returns `version.successfulTestRun`. The readable version is the pending draft when one
exists, otherwise the active version; arbitrary historic versions cannot be unwrapped through
this tool.

See the [Custom Functions documentation](https://docs.transcend.io/docs/integrations/custom-functions).
