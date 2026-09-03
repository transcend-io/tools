import {
  createToolResult,
  defineToolWithCapabilities,
  ErrorCode,
  McpClientCapability,
  ToolError,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import { COOKIE_TRIAGE_APP_RESOURCE } from '../apps/cookie-triage.js';
import type {
  ConsentTriageType,
  CookieTriageAppInput,
  CookieTriageAppPayload,
} from '../lib/cookieTriageTypes.js';
import {
  COOKIE_TRIAGE_FETCH_MAX,
  COOKIE_TRIAGE_FETCH_PAGE_SIZE,
  fetchConsentTriageItems,
  fetchTriageOrganizationName,
} from '../lib/fetchConsentTriageItems.js';
import {
  COOKIE_TRIAGE_MAX_PER_PURPOSE,
  groupCookiesForTriage,
} from '../lib/groupCookiesForTriage.js';

export const ConsentTriageTypeSchema = z
  .enum(['cookies', 'data_flows'])
  .describe('Open the review UI for cookies or data flows that need review');

export const CookieTriageAppSchema = z.object({
  triageType: ConsentTriageTypeSchema,
}) satisfies z.ZodType<CookieTriageAppInput>;

const COOKIE_TRIAGE_APP_DESCRIPTION = `Opens an interactive consent triage review UI for cookies or data flows. Pass triageType ("cookies" | "data_flows"). On MCP App hosts the tool returns a fast shell and the view pages consent_list_cookies or consent_list_data_flows; elsewhere the tool fetches the organization name and items (pages of ${COOKIE_TRIAGE_FETCH_PAGE_SIZE}, cap ~${COOKIE_TRIAGE_FETCH_MAX}), groups by purpose (≤${COOKIE_TRIAGE_MAX_PER_PURPOSE}/tab), and sorts by traffic. No agent classification suggestions. Use the consent-triage prompt for the full workflow.`;

/**
 * Re-throw a fetch failure with the step name so the UI/agent can see what broke.
 *
 * @param step - Which fetch failed
 * @param triageType - cookies vs data_flows
 * @param error - Underlying failure
 */
function wrapTriageFetchError(
  step: 'organization' | ConsentTriageType,
  triageType: ConsentTriageType,
  error: unknown,
): ToolError {
  const message = error instanceof Error ? error.message : String(error);
  const code = error instanceof ToolError ? error.code : ErrorCode.API_ERROR;
  const retryable = error instanceof ToolError ? error.retryable : false;
  const details = {
    step,
    triageType,
    ...(error instanceof ToolError && error.details ? error.details : {}),
  };

  return new ToolError(
    code,
    `Failed to fetch ${step} for consent triage (${triageType}): ${message}`,
    retryable,
    details,
  );
}

/**
 * Fast shell so MCP App hosts can mount the iframe before GraphQL work starts.
 *
 * @param input - Open-app arguments
 * @returns Payload with `loaded: false` and empty categories
 */
function buildShellPayload(input: CookieTriageAppInput): CookieTriageAppPayload {
  return {
    triageType: input.triageType,
    organizationName: '',
    categories: [],
    loaded: false,
  };
}

/**
 * Interactive cookie/data-flow triage review UI that loads NEEDS_REVIEW items from the API.
 *
 * On MCP App hosts the open call returns a shell immediately; the view then pages
 * `consent_list_cookies` or `consent_list_data_flows`. Baseline hosts get the
 * full payload from the main tool handler.
 */
export function createConsentCookieTriageAppTool(clients: ToolClients) {
  async function buildPayload(input: CookieTriageAppInput): Promise<CookieTriageAppPayload> {
    let organizationName: string;
    try {
      organizationName = await fetchTriageOrganizationName(clients);
    } catch (error) {
      console.error('[consent_cookie_triage_review_app] organization fetch failed', error);
      throw wrapTriageFetchError('organization', input.triageType, error);
    }

    let items;
    try {
      items = await fetchConsentTriageItems(clients, input.triageType);
    } catch (error) {
      console.error(`[consent_cookie_triage_review_app] ${input.triageType} fetch failed`, error);
      throw wrapTriageFetchError(input.triageType, input.triageType, error);
    }

    return {
      triageType: input.triageType,
      organizationName,
      categories: groupCookiesForTriage(items),
      loaded: true,
    };
  }

  return defineToolWithCapabilities({
    name: 'consent_cookie_triage_review_app',
    description: COOKIE_TRIAGE_APP_DESCRIPTION,
    category: 'Consent Management',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: CookieTriageAppSchema,
    handler: async (input) => createToolResult(true, await buildPayload(input)),
    variants: {
      [McpClientCapability.McpApp]: {
        resource: COOKIE_TRIAGE_APP_RESOURCE,
        handler: async (input) => createToolResult(true, buildShellPayload(input)),
      },
    },
  });
}
