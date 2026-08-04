---
'@transcend-io/mcp-server-base': minor
'@transcend-io/mcp': minor
---

Serve `ui://` HTML resources and resolve tools to a per-capability variant, so one tool definition can return plain text to a scripted client, a form to a host that supports elicitation, and an interactive view to a host that supports MCP Apps (SEP-1865).

`defineToolWithCapabilities` declares the variants; `buildMcpServer` resolves them per connection and registers `resources/list` and `resources/read` for any bound views. Tools carry a `_meta.ui.resourceUri` binding, emitted in both the canonical nested and deprecated flat forms because hosts shipped against the earlier draft still read the flat key. App-only tools stay callable through `tools/call` while being hidden from `tools/list`, so a view can reach its own helpers without cluttering the model's tool set.

For a server with no views nothing changes on the wire: the `resources` capability is only declared when at least one `ui://` resource exists, so those handshakes stay byte-identical.
