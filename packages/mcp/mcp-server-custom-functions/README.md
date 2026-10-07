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

The credentials need `ViewCustomFunction`, `ManageCustomFunction`, and `ConnectDataSilos`.
`SOMBRA_URL` and
`SOMBRA_CUSTOMER_KEY` must refer to the same single-tenant gateway used by the target data silo
or GENERAL function. Customers with multiple STS Sombra gateways can run separate server
configurations for each URL/key pair.

## Tools

| Tool                               | Purpose                                                                 |
| ---------------------------------- | ----------------------------------------------------------------------- |
| `custom_functions_upsert`          | Sign plaintext code and create or update a Custom Function (save draft) |
| `custom_functions_list`            | List functions, lifecycle state, gateway, and version metadata          |
| `custom_functions_get_code`        | Unwrap the readable version to plaintext for editing                    |
| `custom_functions_promote_version` | Promote a pending draft to active                                       |
| `custom_functions_test_run`        | Test unsaved plaintext or a stored function, and mark it tested on pass |

The normal agent loop is:

```text
upsert (unique name, environmentVariables for env — never pass secret values)
  → custom_functions_get_code (verify draft)
  → custom_functions_test_run({ id })
  → custom_functions_promote_version
```

Use `environmentVariables` with `key`, `isSecret`, and optional `value` for **plain** variables
only. Secrets are set in the Admin Dashboard. `name` / `description` updates apply immediately
without creating a version; code and runtime settings write a draft.

Creating a DSR function without `dataSiloId` also creates a `customFunction` data silo on the
resolved Sombra gateway. On update, omit `code` to keep stored code when changing env, hosts, or
timeout. Omit `allowedHosts` on update to keep the saved allowlist; pass `[]` for localhost only.

`custom_functions_get_code` returns `settings`, `environmentVariables` (`isSet`, plain `value`
when applicable), and never secret values. The readable version is the pending draft when one
exists, otherwise the active version.

`custom_functions_test_run` with `{ id }` tests the readable version. A passing run marks a
pending draft (or an active DSR version) as tested. `custom_functions_promote_version` may return
`untestedWarning` when the draft was not tested first.
