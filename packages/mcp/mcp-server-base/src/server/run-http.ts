import { randomUUID } from 'node:crypto';
import type { Server as HttpServer } from 'node:http';

import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import cors from 'cors';
import type { Request, Response } from 'express';

import { requestAuthContext } from '../auth-context.js';
import type { AuthCredentials } from '../auth.js';
import { SimpleLogger } from '../clients/graphql/base.js';
import {
  MCP_CALLER_HEADER,
  MCP_SESSION_ID_HEADER,
  TRANSCEND_ACTIVE_ORG_ID_HEADER,
  TRANSCEND_API_KEY_HEADER,
} from '../http-header-names.js';
import { extractMcpCallerFromHeaders, requestMcpCallerContext } from '../mcp-caller-context.js';
import { InMemoryEventStore } from './event-store.js';
import type { TransportConfig } from './parse-args.js';
import { tryResolveAuth } from './resolve-auth.js';

export interface McpHttpServerOptions {
  /** Server display name */
  name: string;
  /** Server version */
  version: string;
  /**
   * Factory to create a new MCP Server for each HTTP session.
   *
   * `auth` is `null` when the client's initialization request carries
   * no credentials (e.g. MCPClient handshake at startup). In this case
   * the server can still serve `tools/list` but tool calls that hit the
   * backend will fail until auth is provided via per-request headers
   * (resolved automatically via {@link requestAuthContext}).
   */
  createServer: (auth: AuthCredentials | null) => Server | Promise<Server>;
  /**
   * Origin of the OAuth authorization server that issues tokens for this resource
   * (the Transcend API, e.g. `https://api.transcend.io`, which serves
   * `/.well-known/oauth-authorization-server`). Required when
   * {@link TransportConfig.publicUrl} is set; ignored otherwise.
   */
  authorizationServerUrl?: string;
  /** OAuth scopes advertised as `scopes_supported` in the protected resource metadata. */
  scopesSupported?: readonly string[];
}

export interface McpHttpServer {
  /** Underlying Node HTTP server */
  httpServer: HttpServer;
  /** Gracefully shut down the server and all sessions */
  shutdown: () => Promise<void>;
}

/** Path prefix of OAuth Protected Resource Metadata (RFC 9728). */
const PROTECTED_RESOURCE_METADATA_PATH = '/.well-known/oauth-protected-resource';

async function runWithInboundHttpContext(
  headers: Record<string, string | string[] | undefined>,
  fn: () => Promise<void>,
  authOptions?: Parameters<typeof tryResolveAuth>[1],
): Promise<void> {
  const auth = tryResolveAuth(headers, authOptions);
  const mcpCaller = extractMcpCallerFromHeaders(headers);

  let contextWrappedFn = fn;
  if (mcpCaller !== undefined) {
    const prev = contextWrappedFn;
    contextWrappedFn = () => requestMcpCallerContext.run(mcpCaller, prev);
  }
  if (auth) {
    const prev = contextWrappedFn;
    contextWrappedFn = () => requestAuthContext.run(auth, prev);
  }

  return await contextWrappedFn();
}

interface SessionEntry {
  /** MCP transport for this session */
  transport: StreamableHTTPServerTransport;
  /** MCP server for this session */
  server: Server;
  /** Timestamp of last activity */
  lastActivityAt: number;
}

/**
 * Starts an MCP server over Streamable HTTP transport.
 *
 * Each client session gets its own {@link Server} and
 * {@link StreamableHTTPServerTransport}. Sessions are identified by the
 * {@link MCP_SESSION_ID_HEADER} header and cleaned up after an idle TTL.
 *
 * Per-request auth is propagated via {@link requestAuthContext} so that
 * concurrent requests on the same session each use their own credentials
 * without shared mutable state.
 */
export async function runMcpHttp(
  options: McpHttpServerOptions,
  config: TransportConfig,
): Promise<McpHttpServer> {
  const logger = new SimpleLogger();
  const sessions = new Map<string, SessionEntry>();

  const app = createMcpExpressApp({ host: config.host });

  // Public hosted mode is opt-in. When unset, none of the code paths below change.
  const publicUrl = config.publicUrl?.replace(/\/+$/, '') || undefined;
  const authOptions = publicUrl ? { ignoreEnvApiKey: true } : undefined;
  const protectedResourceMetadataUrl = publicUrl
    ? `${publicUrl}${PROTECTED_RESOURCE_METADATA_PATH}${config.mcpPath}`
    : undefined;
  let authorizationServerOrigin: string | undefined;
  if (publicUrl) {
    if (!options.authorizationServerUrl) {
      throw new Error(
        'runMcpHttp: `authorizationServerUrl` is required when a public URL is configured.',
      );
    }
    authorizationServerOrigin = new URL(options.authorizationServerUrl).origin;
  }

  if (config.corsOrigins.length > 0) {
    app.use(
      cors({
        origin: config.corsOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
          'Content-Type',
          'Cookie',
          MCP_SESSION_ID_HEADER,
          'Authorization',
          TRANSCEND_API_KEY_HEADER,
          TRANSCEND_ACTIVE_ORG_ID_HEADER,
          MCP_CALLER_HEADER,
          'Last-Event-ID',
        ],
        exposedHeaders: [MCP_SESSION_ID_HEADER, 'WWW-Authenticate'],
      }),
    );
  }

  // Health check — no MCP session required (LINK-5830)
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      name: options.name,
      version: options.version,
    });
  });

  if (publicUrl && protectedResourceMetadataUrl && authorizationServerOrigin) {
    // RFC 9728 OAuth Protected Resource Metadata. Served at the bare well-known path and
    // at the path-suffixed form that clients derive from the resource URL.
    const metadata = {
      resource: `${publicUrl}${config.mcpPath}`,
      authorization_servers: [authorizationServerOrigin],
      bearer_methods_supported: ['header'],
      ...(options.scopesSupported &&
        options.scopesSupported.length > 0 && { scopes_supported: [...options.scopesSupported] }),
    };
    const serveMetadata = (_req: Request, res: Response) => {
      res.json(metadata);
    };
    app.get(PROTECTED_RESOURCE_METADATA_PATH, serveMetadata);
    app.get(`${PROTECTED_RESOURCE_METADATA_PATH}${config.mcpPath}`, serveMetadata);

    // Challenge unauthenticated MCP calls so clients can discover the authorization server.
    // Registered after /health and the metadata routes, which stay public.
    const requireAuthChallenge = (req: Request, res: Response, next: () => void) => {
      if (req.method !== 'POST' && req.method !== 'GET' && req.method !== 'DELETE') {
        next();
        return;
      }
      const auth = tryResolveAuth(
        req.headers as Record<string, string | string[] | undefined>,
        authOptions,
      );
      if (auth) {
        next();
        return;
      }
      res
        .status(401)
        .set('WWW-Authenticate', `Bearer resource_metadata="${protectedResourceMetadataUrl}"`)
        .json({
          jsonrpc: '2.0',
          error: { code: -32001, message: 'Unauthorized: authentication required' },
          id: null,
        });
    };
    app.use(config.mcpPath, requireAuthChallenge);
  }

  // POST /mcp — main JSON-RPC endpoint
  app.post(config.mcpPath, async (req: Request, res: Response) => {
    const sessionId = req.headers[MCP_SESSION_ID_HEADER] as string | undefined;

    try {
      // Existing session — resolve per-request auth into AsyncLocalStorage
      if (sessionId && sessions.has(sessionId)) {
        const session = sessions.get(sessionId)!;
        session.lastActivityAt = Date.now();

        const handleReq = () => session.transport.handleRequest(req, res, req.body);
        await runWithInboundHttpContext(
          req.headers as Record<string, string | string[] | undefined>,
          handleReq,
          authOptions,
        );
        return;
      }

      // New initialization request — auth is optional (MCPClient handshake)
      if (!sessionId && isInitializeRequest(req.body)) {
        const auth = tryResolveAuth(
          req.headers as Record<string, string | string[] | undefined>,
          authOptions,
        );
        const server = await options.createServer(auth);

        const eventStore = new InMemoryEventStore();
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          eventStore,
          onsessioninitialized: (sid: string) => {
            sessions.set(sid, {
              transport,
              server,
              lastActivityAt: Date.now(),
            });
            logger.info(`Session initialized: ${sid}`);
          },
        });

        transport.onclose = () => {
          const sid = transport.sessionId;
          if (sid && sessions.has(sid)) {
            sessions.delete(sid);
            logger.info(`Session closed: ${sid}`);
          }
        };

        await server.connect(transport);
        const handleReq = () => transport.handleRequest(req, res, req.body);
        await runWithInboundHttpContext(
          req.headers as Record<string, string | string[] | undefined>,
          handleReq,
          authOptions,
        );
        return;
      }

      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Bad Request: No valid session ID provided' },
        id: null,
      });
    } catch (error) {
      logger.error('Error handling MCP POST request:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        });
      }
    }
  });

  // GET /mcp — SSE stream for server-to-client notifications
  app.get(config.mcpPath, async (req: Request, res: Response) => {
    const sessionId = req.headers[MCP_SESSION_ID_HEADER] as string | undefined;
    if (!sessionId || !sessions.has(sessionId)) {
      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Invalid or missing session ID' },
        id: null,
      });
      return;
    }

    const session = sessions.get(sessionId)!;
    session.lastActivityAt = Date.now();
    await session.transport.handleRequest(req, res);
  });

  // DELETE /mcp — session termination
  app.delete(config.mcpPath, async (req: Request, res: Response) => {
    const sessionId = req.headers[MCP_SESSION_ID_HEADER] as string | undefined;
    if (!sessionId || !sessions.has(sessionId)) {
      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Invalid or missing session ID' },
        id: null,
      });
      return;
    }

    const session = sessions.get(sessionId)!;
    await session.transport.close();
    sessions.delete(sessionId);
    logger.info(`Session terminated via DELETE: ${sessionId}`);
    res.status(200).end();
  });

  // Session TTL sweeper
  const sweepIntervalMs = Math.min(config.sessionTtlMs / 2, 60_000);
  const sweepTimer = setInterval(() => {
    const now = Date.now();
    for (const [sid, session] of sessions) {
      if (now - session.lastActivityAt > config.sessionTtlMs) {
        logger.info(`Session expired (idle ${config.sessionTtlMs}ms): ${sid}`);
        sessions.delete(sid);
        session.transport.close().catch((err) => {
          logger.error(`Error closing expired session ${sid}:`, err);
        });
      }
    }
  }, sweepIntervalMs);
  sweepTimer.unref();

  const httpServer = await new Promise<HttpServer>((resolve) => {
    const server = app.listen(config.port, config.host, () => {
      logger.info(`${options.name} HTTP server listening`, {
        url: `http://${config.host}:${config.port}${config.mcpPath}`,
        health: `http://${config.host}:${config.port}/health`,
      });
      resolve(server);
    });
  });

  const shutdown = async () => {
    clearInterval(sweepTimer);
    httpServer.close();
    for (const [sid, session] of sessions) {
      try {
        await session.transport.close();
      } catch (err) {
        logger.error(`Error closing session ${sid} during shutdown:`, err);
      }
    }
    sessions.clear();
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return { httpServer, shutdown };
}
