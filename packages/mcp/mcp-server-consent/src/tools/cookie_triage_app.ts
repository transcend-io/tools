import {
  createToolResult,
  defineToolWithCapabilities,
  McpClientCapability,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import { COOKIE_TRIAGE_APP_RESOURCE } from '../apps/cookie-triage.js';
import type { CookieTriageAppInput } from '../lib/cookieTriageTypes.js';
import {
  COOKIE_TRIAGE_MAX_PER_PURPOSE,
  groupCookiesForTriage,
} from '../lib/groupCookiesForTriage.js';

const CookieTriageSuggestion = z.enum(['approve', 'junk', 'review']);

export const CookieTriageAnalysisSchema = z.object({
  name: z.string().describe('Cookie name (upsert key)'),
  id: z.string().optional().describe('Cookie ID when available'),
  service: z.string().optional().describe('Service title from consent_list_cookies'),
  trackingPurposes: z
    .array(z.string())
    .optional()
    .describe('Assigned purpose slugs — needed for purpose tabs'),
  occurrences: z.number().optional().describe('Telemetry occurrence count'),
  lastActivityAt: z
    .string()
    .optional()
    .describe('ISO 8601 last-seen time (lastDiscoveredAt from consent_list_cookies)'),
  suggestion: CookieTriageSuggestion.describe(
    'approve = known tracker; junk = noise; review = needs a human',
  ),
  reason: z.string().min(1).describe('Short rationale (prefer ≤80 chars)'),
});

export const CookieTriageAppSchema = z.object({
  organizationName: z
    .string()
    .min(1)
    .describe('Org display name from admin_get_organization'),
  cookies: z
    .array(CookieTriageAnalysisSchema)
    .min(1)
    .max(COOKIE_TRIAGE_MAX_PER_PURPOSE * 6)
    .describe(
      'Flat projected cookies (not full API objects). Tool groups by purpose and sorts by traffic.',
    ),
}) satisfies z.ZodType<CookieTriageAppInput>;

/** Soft target for a single app open; paginate list fetches up to the schema max. */
const COOKIE_TRIAGE_FETCH_PAGE_SIZE = 100;

const COOKIE_TRIAGE_APP_DESCRIPTION = `Opens a cookie triage review UI. Pass organizationName (admin_get_organization) and a flat projected cookies array from consent_list_cookies { status: "NEEDS_REVIEW", first: ${COOKIE_TRIAGE_FETCH_PAGE_SIZE} } (omit order/purpose filters; cap ~${COOKIE_TRIAGE_MAX_PER_PURPOSE * 6}). Project slim fields, classify locally (approve|junk|review + short reason), call once — this tool groups by purpose (≤${COOKIE_TRIAGE_MAX_PER_PURPOSE}/tab) and sorts by traffic. Prefer speed; no web search unless asked. Use the consent-triage prompt for the full workflow.`;

/** Shared by both variants, so a host without MCP Apps describes the same result. */
function cookieTriagePayload(input: CookieTriageAppInput): unknown {
  return createToolResult(true, {
    organizationName: input.organizationName,
    categories: groupCookiesForTriage(input.cookies),
  });
}

/**
 * Interactive cookie triage review UI fed by agent classification suggestions (local metadata).
 *
 * Renders as an MCP App on capable hosts; returns structured JSON everywhere else.
 */
export function createConsentCookieTriageAppTool(_clients?: ToolClients) {
  return defineToolWithCapabilities({
    name: 'consent_cookie_triage_review_app',
    description: COOKIE_TRIAGE_APP_DESCRIPTION,
    category: 'Consent Management',
    readOnly: true,
    requireAuth: false,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: CookieTriageAppSchema,
    handler: async (input) => cookieTriagePayload(input),
    variants: {
      [McpClientCapability.McpApp]: {
        resource: COOKIE_TRIAGE_APP_RESOURCE,
        handler: async (input) => cookieTriagePayload(input),
      },
    },
  });
}
