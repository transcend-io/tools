import {
  DEFAULT_TRANSCEND_API_URL,
  getRequestAuth,
  type AuthCredentials,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import type { Got } from 'got';

import { buildPolicyEngineClient } from './buildPolicyEngineClient.js';

/** Extended MCP clients for Policy Engine tools. */
export interface PolicyToolClients extends ToolClients {
  /** Monolith GraphQL/REST base URL (same host as TRANSCEND_API_URL) */
  transcendApiUrl: string;
  /** Startup auth; per-request auth from {@link getRequestAuth} takes precedence */
  auth: AuthCredentials | null;
}

/**
 * Resolves auth for Policy Engine operations from request context or startup clients.
 *
 * @param clients - MCP tool clients
 * @returns Auth credentials
 */
export function resolvePolicyAuth(clients: PolicyToolClients): AuthCredentials {
  const auth = getRequestAuth() ?? clients.auth;
  if (!auth) {
    throw new Error(
      'Authentication required. Set TRANSCEND_API_KEY or complete OAuth login with Policy Engine scopes.',
    );
  }
  return auth;
}

/**
 * Builds a Policy Engine REST client using the same auth and URL as CLI policy commands.
 *
 * @param clients - MCP tool clients
 * @returns Configured got client
 */
export function createPolicyEngineClient(clients: ToolClients | PolicyToolClients): Got {
  const policyClients = asPolicyToolClients(clients);
  const auth = resolvePolicyAuth(policyClients);
  const transcendUrl = policyClients.transcendApiUrl || DEFAULT_TRANSCEND_API_URL;
  return buildPolicyEngineClient(transcendUrl, auth);
}

/**
 * Narrows generic tool clients to policy-specific fields.
 *
 * @param clients - MCP tool clients from the server factory
 * @returns Policy tool clients
 */
export function asPolicyToolClients(clients: ToolClients | PolicyToolClients): PolicyToolClients {
  const policyClients = clients as PolicyToolClients;
  if (!policyClients.transcendApiUrl) {
    throw new Error('Policy Engine tools require transcendApiUrl on MCP tool clients.');
  }
  return policyClients;
}
