import { ScopeName } from '@transcend-io/privacy-types';
import {
  TR_PULL_RESOURCE_SCOPE_MAP,
  TR_PUSH_RESOURCE_SCOPE_MAP,
} from '@transcend-io/sdk/transcend-yml';

/**
 * OAuth scopes for the config MCP tools (offline_access added by base).
 *
 * The union of every scope the `transcend.yml` pull and push paths can need, so a
 * user can pull or push any section after one sign-in.
 */
export const CONFIG_OAUTH_SCOPES: ScopeName[] = [
  ...new Set([
    ...Object.values(TR_PULL_RESOURCE_SCOPE_MAP).flat(),
    ...Object.values(TR_PUSH_RESOURCE_SCOPE_MAP).flat(),
  ]),
].sort();
