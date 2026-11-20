import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';

import type { AuthCredentials } from '../auth.js';
import { tryResolveAuth } from './resolve-auth.js';
import { runWithInboundHttpContext } from './run-http.js';

export interface CreateWebMcpHandlerOptions {
  /** Server display name */
  name: string;
  /** Server version */
  version: string;
  /**
   * Builds a fresh MCP server instance for one HTTP request.
   *
   * Stateless transport does not reuse servers across requests.
   */
  createServer: (auth: AuthCredentials | null) => Server | Promise<Server>;
  /**
   * Optional auth resolver. Defaults to {@link tryResolveAuth} on request headers.
   */
  resolveAuth?: (
    /** Incoming Fetch API headers */
    headers: Headers,
  ) => AuthCredentials | null;
}

/**
 * Creates a Web Standards Streamable HTTP handler for Vercel, Workers, and other
 * runtimes that expose the Fetch `Request` / `Response` API.
 *
 * Each request uses a fresh stateless transport (`sessionIdGenerator: undefined`).
 */
export function createWebMcpHandler(
  options: CreateWebMcpHandlerOptions,
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    const headerRecord = Object.fromEntries(request.headers.entries());
    const auth = options.resolveAuth?.(request.headers) ?? tryResolveAuth(headerRecord);

    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    const server = await options.createServer(auth);

    try {
      await server.connect(transport);

      const parsedBody =
        request.method === 'POST' ? await request.json().catch(() => undefined) : undefined;

      return await runWithInboundHttpContext(headerRecord, async () =>
        transport.handleRequest(request, { parsedBody }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal server error';
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32603, message },
          id: null,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    } finally {
      try {
        await transport.close();
      } catch {
        // Ignore close errors during teardown.
      }
      try {
        await server.close();
      } catch {
        // Ignore close errors during teardown.
      }
    }
  };
}
