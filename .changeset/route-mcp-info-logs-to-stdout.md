---
"@transcend-io/mcp-server-base": minor
"@transcend-io/mcp": minor
---

Stop Datadog (and other container log collectors that key off the stream) from tagging every MCP info log as Error. `SimpleLogger` previously wrote all log levels to stderr unconditionally; in HTTP transport that meant routine lines like `Executing tool: ...`, `Returning N tools`, and `HTTP server listening` were classified as `Error` in Datadog despite the JSON `level` field saying `info`.

`SimpleLogger` now exposes a static `setInfoToStdout(enabled)` configuration. When enabled (called automatically for HTTP transport in `createMCPServer` and the unified `mcp` CLI), `info` and `debug` route to `process.stdout` while `warn` and `error` stay on `process.stderr`. The default remains all-stderr so stdio MCP transport keeps working without polluting the JSON-RPC protocol on stdout.

Also:

- The duplicate-tool-name warning in `ToolRegistry` now goes through `SimpleLogger.warn` instead of bypassing it with a direct `process.stderr.write`, so it benefits from the same routing config and emits structured JSON consistent with the rest of the server's logs.
- `SimpleLogger` keeps strict `(message: string, data?: unknown)` method signatures for compile-time safety on direct callers, while satisfying a wider variadic `Logger` interface (structurally identical to the one in `@transcend-io/utils`) via TypeScript's method bivariance. No new runtime dependencies introduced.
