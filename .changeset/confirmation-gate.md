---
'@transcend-io/mcp-server-base': minor
'@transcend-io/mcp': minor
---

**@transcend-io/mcp-server-base:** Add a server-enforced confirmation gate. A tool declaring `confirmation: { hint }` on its `ToolDefinition` no longer reaches its handler until a human agrees. On a host that renders forms the gate asks through `elicitation/create`; on one that cannot it issues a single-use approval token bound to the tool, a hash of the arguments, and the caller's auth subject, which the agent replays after getting the user's agreement.

How approval may be obtained is decided by the transport, not by the caller. `buildMcpServer` now requires `transport`, and over HTTP the policy is `REFUSE`: the caller there is another service rather than a person at a keyboard, so gated tools refuse every call with `CONFIRMATION_UNAVAILABLE` and point the user at the admin dashboard. The check happens before anything the client declared is consulted, because a declared elicitation capability is a claim by the party being gated — a client that says it renders forms and then answers its own prompt has approved on the user's behalf.

Declaring the capability is also not a promise to honor the request. A host that errors, never answers within the timeout, or replies with a shape the SDK validates and rejects now falls through to the approval-token fallback rather than surfacing an opaque `MCP error`, and confirmation forms are given 10 minutes rather than the SDK's 60-second default, which used to cancel the request while the dialog was still on the user's screen.

`expandToolsForClient` requires its gate argument for the same reason `transport` is required: a default would let a new serving path pick a confirmation policy it never considered.

**@transcend-io/mcp:** `ToolRegistry.executeTool` now applies the gate rather than calling the registered handler directly, so an embedder driving the registry in-process refuses gated tools instead of running them unconfirmed.
