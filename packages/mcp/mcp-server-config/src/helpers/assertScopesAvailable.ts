import {
  ErrorCode,
  getOAuthScopes,
  ToolError,
  type TranscendGraphQLBase,
} from '@transcend-io/mcp-server-base';
import type { ScopeName } from '@transcend-io/privacy-types';

/**
 * Fail fast when a stdio OAuth session never asked for scopes the call needs.
 *
 * Only the scopes requested at sign-in are known here, not the ones the user
 * finally granted, and API keys carry no scope list at all. For those the server
 * answers with an `ACCESS_DENIED` error that already names the missing scopes.
 *
 * @param graphql - Client whose current auth decides whether the check applies
 * @param required - Scopes the call needs
 * @throws ToolError with `missingScopes` when sign-in did not request them
 */
export function assertScopesAvailable(
  graphql: TranscendGraphQLBase,
  required: readonly ScopeName[],
): void {
  if (graphql.effectiveAuth()?.type !== 'oauthToken') return;

  let requested: string[];
  try {
    requested = getOAuthScopes();
  } catch {
    return;
  }

  const missing = required.filter((scope) => !requested.includes(scope));
  if (missing.length === 0) return;

  throw new ToolError(
    ErrorCode.PERMISSION_ERROR,
    `This session did not request scopes needed for these sections: ${missing.join(', ')}. ` +
      'Sign in again with a server that includes the config tools, or use an API key that has them.',
    false,
    { missingScopes: missing },
  );
}
