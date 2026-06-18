/** OAuth scope that enables refresh tokens during authorization. */
export const OFFLINE_ACCESS_SCOPE = 'offline_access';

let configuredScopes: string[] | null = null;

/**
 * Merges one or more scope lists, dedupes, and always includes {@link OFFLINE_ACCESS_SCOPE}.
 */
export function mergeOAuthScopes(...scopeLists: readonly (readonly string[])[]): string[] {
  const merged = new Set<string>(scopeLists.flat());
  merged.add(OFFLINE_ACCESS_SCOPE);
  return [...merged];
}

/**
 * Configures OAuth scopes for this process. {@link OFFLINE_ACCESS_SCOPE} is added automatically.
 */
export function configureOAuthScopes(scopes: readonly string[]): void {
  configuredScopes = mergeOAuthScopes(scopes);
}

/**
 * Returns configured OAuth scopes for authorization. Throws if {@link configureOAuthScopes} was not called.
 */
export function getOAuthScopes(): string[] {
  if (configuredScopes) {
    return [...configuredScopes];
  }
  throw new Error(
    'OAuth scopes are not configured. Pass oauthScopes to createMCPServer or call configureOAuthScopes() before OAuth login.',
  );
}

/** Resets configured OAuth scopes (for tests). */
export function resetConfiguredOAuthScopes(): void {
  configuredScopes = null;
}
