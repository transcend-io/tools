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

function parseIntOrDefault(raw: string | undefined, fallback: number): number {
  if (raw == null) return fallback;
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) {
    throw new Error(`Invalid numeric value: "${raw}"`);
  }
  return n;
}

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

  const port = parseIntOrDefault(
    (values.port as string | undefined) ?? process.env.TRANSCEND_HTTP_PORT,
    DEFAULT_PORT,
  );

  const host = (values.host as string) || process.env.TRANSCEND_HTTP_HOST || DEFAULT_HOST;

  const mcpPath = (values['mcp-path'] as string) || DEFAULT_MCP_PATH;

  const corsOrigins: string[] = [];
  if (values['cors-origin']) {
    corsOrigins.push(...(values['cors-origin'] as string[]));
  } else if (process.env.TRANSCEND_MCP_CORS_ORIGINS) {
    corsOrigins.push(...process.env.TRANSCEND_MCP_CORS_ORIGINS.split(',').map((s) => s.trim()));
  }

  const sessionTtlMs = parseIntOrDefault(
    process.env.TRANSCEND_MCP_SESSION_TTL_MS,
    DEFAULT_SESSION_TTL_MS,
  );

  return { transport, port, host, mcpPath, corsOrigins, sessionTtlMs };
}
