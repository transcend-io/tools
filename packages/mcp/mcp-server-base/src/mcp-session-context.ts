import { AsyncLocalStorage } from 'node:async_hooks';

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { RequestOptions } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ElicitRequestFormParams, ElicitResult } from '@modelcontextprotocol/sdk/types.js';

import { McpClientCapability, type ClientCapabilityReport } from './capabilities/types.js';

/**
 * What a tool handler can learn about the host it is currently serving.
 *
 * Populated for the duration of a `tools/list` or `tools/call` request. The MCP
 * {@link Server} is carried alongside the capability report because
 * server-to-client requests such as elicitation are methods on it.
 */
export interface McpSession {
  /** Capabilities and identity of the connected host */
  client: ClientCapabilityReport;
  /** MCP server handling this request, for server-initiated requests */
  server: Server;
}

/**
 * Per-request MCP session context. Each inbound request stores the host's
 * resolved capabilities here so tool handlers can adapt without threading the
 * server through every call signature.
 */
export const mcpSessionContext = new AsyncLocalStorage<McpSession>();

/**
 * Returns the session for the current async execution context, or `undefined`
 * outside a request (for example in unit tests that invoke a handler directly).
 */
export function getMcpSession(): McpSession | undefined {
  return mcpSessionContext.getStore();
}

/**
 * Whether the connected host declared a capability.
 *
 * Returns `false` when there is no session, so a handler calling this outside a
 * request takes its baseline path rather than crashing.
 */
export function hasCapability(
  /** Capability to test for */
  capability: McpClientCapability,
): boolean {
  return getMcpSession()?.client.capabilities.has(capability) ?? false;
}

/**
 * Asks the host to collect input from the user via a form.
 *
 * Returns `undefined` when the host cannot show one, so callers must handle that
 * and fall back to their own behavior. Attempting the request anyway would throw
 * inside the SDK, since `elicitInput` checks the declared capability itself.
 *
 * Declaring the capability is not a promise to honor the request: this can still
 * reject if the host errors, never answers within the timeout, or replies with a
 * shape the SDK validates `requestedSchema` against and refuses. Callers waiting
 * on a person's answer should catch that and treat it as no answer.
 *
 * `requestedSchema` is restricted by the spec to a flat object of primitives —
 * no nesting. {@link assertElicitFormSchema} enforces that at tool construction.
 */
export async function requestElicitation(
  /** Prompt explaining to the user what is being asked and why */
  message: string,
  /** Flat, primitives-only JSON Schema describing the fields to collect */
  requestedSchema: ElicitRequestFormParams['requestedSchema'],
  /**
   * Overrides for the outbound request. Worth setting `timeout` whenever a person
   * has to read and answer, since the SDK default is 60s.
   */
  options?: RequestOptions,
): Promise<ElicitResult | undefined> {
  const session = getMcpSession();
  if (!session || !session.client.capabilities.has(McpClientCapability.Elicitation)) {
    return undefined;
  }
  return await session.server.elicitInput({ mode: 'form', message, requestedSchema }, options);
}
