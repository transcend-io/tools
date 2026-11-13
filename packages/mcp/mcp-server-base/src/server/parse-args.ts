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
  /**
   * Public base URL this server is reachable at (e.g. `https://mcp.transcend.io`).
   * Opt-in: when set, the HTTP transport serves OAuth Protected Resource Metadata
   * and rejects unauthenticated MCP requests with a `401` + `WWW-Authenticate`
   * challenge. When unset, the transport behaves exactly as before.
   */
  publicUrl?: string;
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
 * Validates and normalizes the public URL: must be an absolute http(s) URL; trailing
 * slashes are dropped. Returns `undefined` for unset or blank values.
 */
function normalizePublicUrl(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`Invalid public URL: "${trimmed}"`);
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`Invalid public URL (must be http or https): "${trimmed}"`);
  }
  return trimmed.replace(/\/+$/, '');
}

/**
 * Parses CLI flags and environment variables for transport configuration.
 *
 * Flags: --transport stdio|http, --port, --host, --mcp-path, --cors-origin (repeatable),
 *        --public-url
 * Env:   TRANSCEND_HTTP_PORT, TRANSCEND_HTTP_HOST, TRANSCEND_MCP_CORS_ORIGINS (comma-separated),
 *        TRANSCEND_MCP_SESSION_TTL_MS, TRANSCEND_MCP_PUBLIC_URL
 */
export function parseTransportArgs(): TransportConfig {
  const { values } = parseArgs({
    options: {
      transport: { type: 'string', default: 'stdio' },
      port: { type: 'string' },
      host: { type: 'string' },
      'mcp-path': { type: 'string' },
      'cors-origin': { type: 'string', multiple: true },
      'public-url': { type: 'string' },
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

  const publicUrl = normalizePublicUrl(
    (values['public-url'] as string | undefined) ?? process.env.TRANSCEND_MCP_PUBLIC_URL,
  );

  return {
    transport,
    port,
    host,
    mcpPath,
    corsOrigins,
    sessionTtlMs,
    ...(publicUrl && { publicUrl }),
  };
}
