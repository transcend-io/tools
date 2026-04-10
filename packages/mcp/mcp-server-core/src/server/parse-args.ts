import { parseArgs } from 'node:util';

export interface TransportConfig {
  /** Transport type: stdio (default) or http */
  transport: 'stdio' | 'http';
  /** HTTP listen port */
  port: number;
  /** HTTP listen host */
  host: string;
  /** MCP endpoint path */
  mcpPath: string;
  /** Allowed CORS origins */
  corsOrigins: string[];
  /** Session idle TTL in milliseconds */
  sessionTtlMs: number;
}

const DEFAULT_PORT = 3000;
const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_MCP_PATH = '/mcp';
const DEFAULT_SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Parses CLI flags and environment variables for transport configuration.
 *
 * Flags: --transport stdio|http, --port, --host, --mcp-path, --cors-origin (repeatable)
 * Env:   TRANSCEND_HTTP_PORT, TRANSCEND_HTTP_HOST, TRANSCEND_MCP_CORS_ORIGINS (comma-separated),
 *        TRANSCEND_MCP_SESSION_TTL_MS
 */
export function parseTransportArgs(): TransportConfig {
  const { values } = parseArgs({
    options: {
      transport: { type: 'string', default: 'stdio' },
      port: { type: 'string' },
      host: { type: 'string' },
      'mcp-path': { type: 'string' },
      'cors-origin': { type: 'string', multiple: true },
    },
    strict: false,
    allowPositionals: true,
  });

  const transport = values.transport === 'http' ? 'http' : 'stdio';

  const port =
    values.port != null
      ? parseInt(values.port as string, 10)
      : process.env.TRANSCEND_HTTP_PORT
        ? parseInt(process.env.TRANSCEND_HTTP_PORT, 10)
        : DEFAULT_PORT;

  const host = (values.host as string) || process.env.TRANSCEND_HTTP_HOST || DEFAULT_HOST;

  const mcpPath = (values['mcp-path'] as string) || DEFAULT_MCP_PATH;

  const corsOrigins: string[] = [];
  if (values['cors-origin']) {
    corsOrigins.push(...(values['cors-origin'] as string[]));
  } else if (process.env.TRANSCEND_MCP_CORS_ORIGINS) {
    corsOrigins.push(...process.env.TRANSCEND_MCP_CORS_ORIGINS.split(',').map((s) => s.trim()));
  }

  const sessionTtlMs = process.env.TRANSCEND_MCP_SESSION_TTL_MS
    ? parseInt(process.env.TRANSCEND_MCP_SESSION_TTL_MS, 10)
    : DEFAULT_SESSION_TTL_MS;

  return { transport, port, host, mcpPath, corsOrigins, sessionTtlMs };
}
