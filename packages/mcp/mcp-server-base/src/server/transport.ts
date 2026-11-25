/** How an MCP server talks to its clients. */
export enum McpTransport {
  /** Local process over stdin/stdout. Runs on the user's machine, so it has their filesystem. */
  Stdio = 'stdio',
  /** Shared Streamable HTTP server. Has no user filesystem. */
  Http = 'http',
}
