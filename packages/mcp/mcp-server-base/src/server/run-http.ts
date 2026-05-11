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
  extractMcpCallerFromHeaders,
  requestMcpCallerContext,
} from '../mcp-caller-context.js';
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
}

export interface McpHttpServer {
  /** Underlying Node HTTP server */
  httpServer: HttpServer;
  /** Gracefully shut down the server and all sessions */
  shutdown: () => Promise<void>;
}

async function runWithInboundHttpContext(
  headers: Record<string, string | string[] | undefined>,
  fn: () => Promise<void>,
): Promise<void> {
  const auth = tryResolveAuth(headers);
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
 * `mcp-session-id` header and cleaned up after an idle TTL.
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

  if (config.corsOrigins.length > 0) {
    app.use(
      cors({
        origin: config.corsOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
          'Content-Type',
          'Cookie',
          'mcp-session-id',
          'Authorization',
          'X-Transcend-Api-Key',
          'x-transcend-active-organization-id',
          MCP_CALLER_HEADER,
          'Last-Event-ID',
        ],
        exposedHeaders: ['mcp-session-id'],
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

  // POST /mcp — main JSON-RPC endpoint
  app.post(config.mcpPath, async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    try {
      // Existing session — resolve per-request auth into AsyncLocalStorage
      if (sessionId && sessions.has(sessionId)) {
        const session = sessions.get(sessionId)!;
        session.lastActivityAt = Date.now();

        const handleReq = () => session.transport.handleRequest(req, res, req.body);
        await runWithInboundHttpContext(
          req.headers as Record<string, string | string[] | undefined>,
          handleReq,
        );
        return;
      }

      // New initialization request — auth is optional (MCPClient handshake)
      if (!sessionId && isInitializeRequest(req.body)) {
        const auth = tryResolveAuth(req.headers as Record<string, string | string[] | undefined>);
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
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
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
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
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
