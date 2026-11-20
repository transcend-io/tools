# @transcend-io/mcp-server-config

Pull and push `transcend.yml` files from MCP tools. Same behavior as `transcend inventory pull` and `transcend inventory push`.

These tools read and write files on your machine, so they run over `stdio` only. The hosted HTTP server does not list them.

## Tools

| Tool                | What it does                                                                                                            |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `config_pull`       | Writes the organization configuration to an absolute `.yml` path. Returns counts.                                       |
| `config_diff`       | Dry-run preview: pull live state, diff the file, return a fenced diff for chat. Read-only.                              |
| `config_push`       | Pushes a `.yml` file to Transcend. Run `config_diff` first. Needs confirmation.                                         |
| `config_get_schema` | Section catalog by default; pass `resources` for partial schema, or `includeFullSchema` for the full file (very large). |

## Run

```bash
npx -y @transcend-io/mcp-server-config
```

Auth works like the other MCP servers. See the [MCP README](../README.md).

## OAuth scopes

The server requests every scope that the pull and push paths can need. See `src/scopes.ts`.
