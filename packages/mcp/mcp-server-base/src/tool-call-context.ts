import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Correlates all outbound Transcend HTTP requests made during a single MCP
 * `tools/call` invocation (same UUID across every fetch in that handler).
 */
export interface ToolCallContext {
  /** MCP tool name from `tools/call` */
  toolName: string;
  /** Unique id shared by every outbound request in this invocation */
  correlationId: string;
}

export const toolCallContext = new AsyncLocalStorage<ToolCallContext>();

/**
 * Returns `x-toolcall-id` header value (`{toolName}:{correlationId}`) for the
 * current tool invocation, or `undefined` when not executing inside a tool handler.
 */
export function getToolCallIdHeader(): string | undefined {
  const ctx = toolCallContext.getStore();
  return ctx ? `${ctx.toolName}:${ctx.correlationId}` : undefined;
}
