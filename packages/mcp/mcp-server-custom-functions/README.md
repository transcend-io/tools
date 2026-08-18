# @transcend-io/mcp-server-custom-functions

MCP tools for listing Transcend Custom Functions and loading plaintext TypeScript for editing.
Signed code is unwrapped through Sombra customer ingress and is never exposed in tool responses.

## Setup

```bash
npm install -g @transcend-io/mcp-server-custom-functions
```

Configure OAuth or `TRANSCEND_API_KEY` as described in the
[MCP setup guide](../README.md), then configure the Sombra gateway used to unwrap code:

```bash
export SOMBRA_URL=https://your-customer-ingress.example.com
export SOMBRA_CUSTOMER_KEY=your-customer-ingress-key
```

The credentials need `ViewDataMap`, `ManageDataMap`, `ConnectDataSilos`, `ViewEmailTemplates`,
and `ExecuteRules`. `SOMBRA_URL` and `SOMBRA_CUSTOMER_KEY` must refer to the same single-tenant
gateway used by the target data silo or GENERAL function.

## Tools

| Tool                        | Purpose                                                |
| --------------------------- | ------------------------------------------------------ |
| `custom_functions_list`     | List functions, lifecycle state, gateway, and versions |
| `custom_functions_get_code` | Unwrap the readable version to plaintext for editing   |

`custom_functions_get_code` is read-only but sensitive because its `userDefinedEnv` response may
contain secrets. It returns `version.successfulTestRun`. The current API exposes the active
version, or the latest draft when there is no active version; arbitrary historic versions cannot
be unwrapped through this tool.

See the [Custom Functions documentation](https://docs.transcend.io/docs/integrations/custom-functions).
