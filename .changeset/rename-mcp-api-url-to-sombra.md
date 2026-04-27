---
"@transcend-io/mcp-server-base": minor
"@transcend-io/mcp": minor
"@transcend-io/mcp-server-admin": minor
"@transcend-io/mcp-server-assessment": minor
"@transcend-io/mcp-server-consent": minor
"@transcend-io/mcp-server-discovery": minor
"@transcend-io/mcp-server-dsr": minor
"@transcend-io/mcp-server-inventory": minor
"@transcend-io/mcp-server-preferences": minor
"@transcend-io/mcp-server-workflows": minor
---

Align MCP env var naming with the rest of the repo.

- `TRANSCEND_API_URL` now points at the GraphQL backend (default `https://api.transcend.io`), matching `@transcend-io/cli` and the convention used throughout `transcend-io/main`.
- The Sombra REST endpoint moves to `SOMBRA_URL` (default `https://multi-tenant.sombra.transcend.io`), matching the env var already read by `@transcend-io/cli` and `@transcend-io/sdk` (`createSombraGotInstance`). Setting `SOMBRA_URL` once now applies to both the CLI/SDK and the MCP server.
- `TRANSCEND_GRAPHQL_URL` is removed.

**Breaking:**

- Anyone who previously set `TRANSCEND_API_URL` to a Sombra URL must rename it to `SOMBRA_URL`.
- Anyone who previously set `TRANSCEND_GRAPHQL_URL` must rename it to `TRANSCEND_API_URL`.
