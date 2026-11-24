import { ToolError } from '@transcend-io/mcp-server-base';
import { McpToolErrorCode, type ScopeName } from '@transcend-io/privacy-types';
import {
  DEFAULT_TRANSCEND_PULL_RESOURCES,
  TR_PULL_RESOURCE_SCOPE_MAP,
  TR_PUSH_RESOURCE_SCOPE_MAP,
  TranscendPullResource,
} from '@transcend-io/sdk';

import { parseResources } from './resources.js';
import { scopesForResources } from './sections.js';

export const TRANSCEND_CONFIG_RESOURCES_ENV = 'TRANSCEND_CONFIG_RESOURCES';

/**
 * Comma-separated section names that cap OAuth scopes and config_pull / config_push.
 * Returns `undefined` when unset so existing deployments keep the full server list.
 */
export function parseConfigResourceAllowlistFromEnv(): TranscendPullResource[] | undefined {
  const raw = process.env[TRANSCEND_CONFIG_RESOURCES_ENV]?.trim();
  if (!raw) return undefined;
  const names = raw
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
  if (names.length === 0) return undefined;
  return parseResources(names);
}

/** OAuth scopes needed to pull and push every section in the allowlist. */
export function oauthScopesForConfigAllowlist(
  allowlist: readonly TranscendPullResource[],
): ScopeName[] {
  return [
    ...new Set([
      ...scopesForResources(allowlist, TR_PULL_RESOURCE_SCOPE_MAP),
      ...scopesForResources(allowlist, TR_PUSH_RESOURCE_SCOPE_MAP),
    ]),
  ].sort();
}

function formatAllowlistError(disallowed: readonly string[], allowlist: readonly string[]): string {
  return (
    `Sections outside ${TRANSCEND_CONFIG_RESOURCES_ENV} allowlist: ${disallowed.join(', ')}. ` +
    `Allowed: ${allowlist.join(', ')}.`
  );
}

export function assertResourcesInAllowlist(
  requested: readonly TranscendPullResource[],
  allowlist: readonly TranscendPullResource[] | undefined,
): void {
  if (!allowlist?.length) return;
  const allowed = new Set(allowlist);
  const disallowed = requested.filter((resource) => !allowed.has(resource));
  if (disallowed.length > 0) {
    throw new ToolError(
      McpToolErrorCode.ValidationError,
      formatAllowlistError(disallowed, allowlist),
      false,
    );
  }
}

export function resolveDefaultPullResources(
  allowlist: readonly TranscendPullResource[] | undefined,
): TranscendPullResource[] {
  return allowlist ? [...allowlist] : [...DEFAULT_TRANSCEND_PULL_RESOURCES];
}

/** Resolve config_pull `resources`, honoring TRANSCEND_CONFIG_RESOURCES when set. */
export function resolvePullResourcesFromInput(
  resources: readonly string[] | undefined,
  allowlist: readonly TranscendPullResource[] | undefined,
): TranscendPullResource[] {
  if (!resources) {
    return resolveDefaultPullResources(allowlist);
  }
  if (resources.includes('all')) {
    return allowlist ? [...allowlist] : [...Object.values(TranscendPullResource)];
  }
  const parsed = parseResources(resources);
  assertResourcesInAllowlist(parsed, allowlist);
  return parsed;
}
