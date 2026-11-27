---
'@transcend-io/mcp-server-base': minor
'@transcend-io/mcp': minor
---

The MCP servers now ask before they open a browser. When a tool call needs a login, your MCP client shows a "Sign in to Transcend" prompt, and the browser opens only after you accept.

- If your MCP client cannot show a prompt, the tool call returns a sign-in link for the agent to show you. Open it, sign in, then ask the agent to retry.
- If you decline, the tool call fails and no new prompt appears for 60 seconds.
- Parallel tool calls share one prompt and one browser window.
- When another MCP process on your machine is already waiting for a sign-in on the same redirect port, the tool call now reports "Sign-in is in progress in another window" instead of stopping the server.

For `@transcend-io/mcp-server-base` consumers: `startOAuthLogin` no longer opens the browser. Open the returned `authorizationUrl` yourself.
