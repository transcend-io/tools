# @transcend-io/mcp-server-privacy-center

> **Beta** — this package is under active development. APIs may change without notice.

MCP tools for Privacy Center configuration, internationalized messages, and privacy-center policies (not Policy Engine Rego bundles).

Requires **Node.js ≥ 22.12** (see `engines` in `package.json`).

## Tools

| Tool                                 | What it does                                                                                  |
| ------------------------------------ | --------------------------------------------------------------------------------------------- |
| `privacy_center_get`                 | Read privacy center settings (same data as `transcend inventory pull` privacy-center section) |
| `privacy_center_write`               | Update settings; optional publish. Footer link sync can delete missing links                  |
| `privacy_center_list_intl_messages`  | List intl messages                                                                            |
| `privacy_center_write_intl_messages` | Create or update intl messages                                                                |
| `privacy_center_list_policies`       | List privacy center policy pages                                                              |
| `privacy_center_write_policies`      | Create or update privacy center policies                                                      |

## Run

```bash
npx -y @transcend-io/mcp-server-privacy-center
```

Auth and OAuth setup match the other MCP servers. See the [MCP README](../README.md).

## OAuth scopes

`ViewPrivacyCenter`, `ManagePrivacyCenter`, `ViewIntlMessages`, `ManageIntlMessages`, `ViewPolicies`, `ManagePolicies`. See [`src/scopes.ts`](./src/scopes.ts).
