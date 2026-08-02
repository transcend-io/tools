---
'@transcend-io/mcp-server-base': minor
---

Negotiate client capabilities from the `initialize` handshake, so a tool can adapt to what the connected host is actually able to render.

Servers now derive the host's capabilities and identity once per connection (`deriveClientCapabilities`, `whatIsTheClient`) and expose them to handlers through an `AsyncLocalStorage` session context, reachable with `getMcpSession()` and `hasCapability()` without threading a server through every call signature. `requestElicitation` asks the host for a form and returns `undefined` when it cannot show one, rather than letting the SDK's own capability check throw and fail the tool call.

Only elicitation and MCP Apps are detected, being the only capabilities a tool can act on differently. Sampling and roots are deliberately excluded: roots is inert for API-backed servers, our target hosts do not implement sampling, and both are deprecated as of the 2026-07-28 spec under SEP-2577.

Nothing changes on the wire yet. Handshakes stay byte-identical, and no tool behaves differently until per-capability variants land.
