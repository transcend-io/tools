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
  id: z.string().optional().describe('Transcend cookie ID when available'),
  service: z
    .string()
    .optional()
    .describe('Service title string (from consent_list_cookies service.title)'),
  trackingPurposes: z
    .array(z.string())
    .optional()
    .describe(
      'Current assigned purpose slugs from consent_list_cookies — required for correct purpose tabs',
    ),
  occurrences: z.number().optional().describe('Telemetry occurrences when available'),
  lastActivityAt: z
    .string()
    .optional()
    .describe(
      'ISO 8601 timestamp when the cookie was last seen in telemetry (lastDiscoveredAt from consent_list_cookies)',
    ),
  suggestion: CookieTriageSuggestion.describe(
    'approve = known tracker with clear purpose; junk = noise / not a real tracker; ' +
      'review = ambiguous or low confidence — needs a human',
  ),
  reason: z
    .string()
    .min(1)
    .describe(
      'Short rationale (prefer ≤80 chars). Stock phrases are fine for well-known cookies ' +
        '(e.g. "Known Google Analytics cookie.").',
    ),
});

export const CookieTriageAppSchema = z.object({
  organizationName: z
    .string()
    .min(1)
    .describe('Display name of the organization being triaged (from admin_get_organization)'),
  cookies: z
    .array(CookieTriageAnalysisSchema)
    .min(1)
    .max(COOKIE_TRIAGE_MAX_PER_PURPOSE * 6)
    .describe(
      'Flat projected cookies (name, suggestion, reason, plus slim fields from consent_list_cookies). ' +
        'Do not pass full API objects — this tool groups by trackingPurposes and sorts by occurrences.',
    ),
}) satisfies z.ZodType<CookieTriageAppInput>;

/** Soft target for a single app open; paginate list fetches up to the schema max. */
const COOKIE_TRIAGE_FETCH_PAGE_SIZE = 100;

const COOKIE_TRIAGE_APP_DESCRIPTION = `Opens a cookie triage review UI. Optimize for speed — show the UI quickly.

Fast path (default — do this):
1. Fetch once: consent_list_cookies { status: "NEEDS_REVIEW", first: ${COOKIE_TRIAGE_FETCH_PAGE_SIZE} }. Omit orderField/orderDirection and trackingPurposes filters. Paginate with offset only if needed (cap ~${COOKIE_TRIAGE_MAX_PER_PURPOSE * 6} cookies for one open).
2. Immediately project each row to slim fields only: name, id, service (service.title string), trackingPurposes, occurrences, lastActivityAt (from lastDiscoveredAt). Drop nested purposes/domains/owners/teams/attributes and any other API fields.
3. Classify in one pass (or chunks of ~50 if the list is huge). Do NOT spawn sub-agents, do NOT web-search, do NOT call consent-research-tracker unless the user explicitly asks for deep research.
4. Heuristic-first from name + service + trackingPurposes:
   - Well-known patterns → approve (e.g. _ga/_gid/_gat → Analytics; _fbp/_fbc → Advertising; transcend_* → Essential CMP; session/auth/csrf/cf_clearance with clear service → approve Essential/Functional as labeled).
   - Noise/test/duplicates/not a real tracker → junk.
   - Missing service, opaque name, or conflicting signals → review.
5. Call this tool ONCE with organizationName (admin_get_organization) and a flat cookies array. Do not group, sort, or dedupe — the tool groups by trackingPurposes (Essential > Functional > Advertising > Analytics > SaleOfInfo; none → NoPurpose), sorts by occurrences, and shows up to ${COOKIE_TRIAGE_MAX_PER_PURPOSE} per purpose.

Each cookie needs name, suggestion (approve|junk|review), and reason. Prefer including trackingPurposes, occurrences, id, service, lastActivityAt. Reasons: short stock phrases OK (≤80 chars); do not write unique essays per cookie.

Do not investigate vendors externally unless the user asks. Default to review when unsure.
`;

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
