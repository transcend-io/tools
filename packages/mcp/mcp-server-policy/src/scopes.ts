import { ScopeName } from '@transcend-io/privacy-types';

/**
 * OAuth scopes for Policy Engine MCP tools (offline_access added by base).
 *
 * Request only {@link ScopeName.ActivatePolicyEngineBundles}: it is a superset of
 * Manage and View, so one credential covers all four tools. Do not ask the user
 * to create separate API keys for publish vs activate.
 */
export const POLICY_OAUTH_SCOPES = [ScopeName.ActivatePolicyEngineBundles] as const;
