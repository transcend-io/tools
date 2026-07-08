import { AsyncLocalStorage } from 'node:async_hooks';

import type { AuthCredentials } from './auth.js';

/**
 * Per-request authentication context. In HTTP transport, each inbound
 * request stores its resolved credentials here so that downstream
 * GraphQL/REST clients use the correct auth without shared mutable state.
 *
 * This eliminates race conditions when concurrent requests on the same
 * MCP session carry different users' credentials — each request's async
 * context holds its own isolated {@link AuthCredentials}.
 */
export const requestAuthContext = new AsyncLocalStorage<AuthCredentials>();

/**
 * Returns the auth credentials for the current async execution context,
 * or `null` when no per-request auth has been set (e.g. stdio transport).
 */
export function getRequestAuth(): AuthCredentials | null {
  return requestAuthContext.getStore() ?? null;
}
