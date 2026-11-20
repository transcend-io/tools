# @transcend-io/mcp-server-config

Pull and push `transcend.yml` files from MCP tools. Same behavior as `transcend inventory pull` and `transcend inventory push`.

These tools read and write files on your machine, so they run over `stdio` only. The hosted HTTP server does not list them.

## Tools

| Tool                | What it does                                                                                                            |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `config_pull`       | Writes the organization configuration to an absolute `.yml` path. Returns counts.                                       |
| `config_push`       | Pushes a `.yml` file to Transcend. Needs confirmation. Returns errors and warnings.                                     |
| `config_get_schema` | Section catalog by default; pass `resources` for partial schema, or `includeFullSchema` for the full file (very large). |

## Run

```bash
npx -y @transcend-io/mcp-server-config
```

Auth works like the other MCP servers. See the [MCP README](../README.md).

## OAuth scopes

By default the server requests every scope that the pull and push paths can need.

Set `TRANSCEND_CONFIG_RESOURCES` to a comma-separated list of section names (for example
`dataSilos,purposes,consentManager`) to narrow OAuth sign-in and reject pull/push calls for
other sections. Unknown names fail at server startup. When the allowlist is set, `config_pull`
defaults and `resources: ["all"]` pull only those sections.
