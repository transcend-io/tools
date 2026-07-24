import { AsyncLocalStorage } from 'node:async_hooks';

import type {
  ElicitRequestFormParams,
  ElicitRequestURLParams,
  ElicitResult,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * Per-`tools/call` helpers for mid-handler elicitation.
 * Bound by {@link buildMcpServer} so tool handlers do not need a `Server` reference.
 */
export interface ElicitContext {
  /**
   * True when the connected client has form elicitation after initialize.
   * Matches SDK `Server.elicitInput`. Note: bare `elicitation: {}` is normalized by
   * the SDK to `{ form: {} }` during initialize, so it counts as supported.
   */
  supportsFormElicitation: boolean;
  /**
   * Sends `elicitation/create` related to the in-flight `tools/call`, then resolves
   * with the client's `accept` / `decline` / `cancel` result.
   */
  elicitInput: (params: ElicitRequestFormParams | ElicitRequestURLParams) => Promise<ElicitResult>;
}

export const elicitContext = new AsyncLocalStorage<ElicitContext>();

/**
 * Returns the elicitation helpers for the current tool invocation, or `undefined`
 * when not executing inside a `tools/call` handler that bound them.
 */
export function getElicitContext(): ElicitContext | undefined {
  return elicitContext.getStore();
}
