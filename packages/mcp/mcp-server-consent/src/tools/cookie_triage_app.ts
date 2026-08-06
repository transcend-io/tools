import {
  createToolResult,
  defineTool,
  defineToolWithCapabilities,
  McpClientCapability,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import { COOKIE_TRIAGE_APP_RESOURCE } from '../apps/cookie-triage.js';
import { mutateTriageItems } from '../cookieTriage/mutate.js';
import { buildQueue, selectCurrentCard, summarizeCard } from '../cookieTriage/queue.js';
import type { CookieTriageReviewType, CookieTriageViewData } from '../cookieTriage/types.js';

export const CookieTriageAppSchema = z.object({
  skippedIds: z
    .array(z.string())
    .optional()
    .describe('Ids previously skipped this session (usually omitted on first open).'),
});
export type CookieTriageAppInput = z.infer<typeof CookieTriageAppSchema>;

export const CookieTriageActSchema = z.object({
  action: z
    .enum(['approve', 'junk', 'skip', 'approve_siblings'])
    .describe('Triage action to apply to the current item (and optional siblings).'),
  id: z.string().describe('Mutation key: cookie name, or data-flow UUID.'),
  reviewType: z
    .enum(['cookie', 'data_flow'])
    .describe('Whether the item is a cookie or a data flow.'),
  purposeSlug: z.string().optional().describe('Tracking purpose slug to assign when approving.'),
  purposeId: z.string().optional().describe('Purpose UUID to assign on data flows when approving.'),
  service: z
    .string()
    .optional()
    .describe('Service integration name or title to assign when approving.'),
  siblingIds: z
    .array(z.string())
    .optional()
    .describe('Sibling mutation ids to approve with approve_siblings.'),
  skippedIds: z.array(z.string()).optional().describe('Ids previously skipped this session.'),
});
export type CookieTriageActInput = z.infer<typeof CookieTriageActSchema>;

/**
 * Loads the live triage queue and returns the current review card payload.
 *
 * @param clients - Tool clients
 * @param skippedIds - Ids skipped this session
 * @returns Unwrapped view data (still wrapped by createToolResult by callers)
 */
async function loadCard(
  clients: ToolClients,
  skippedIds: string[] = [],
): Promise<CookieTriageViewData> {
  const queue = await buildQueue(clients);
  return selectCurrentCard(queue, skippedIds);
}

/**
 * Builds the createToolResult envelope for a triage card.
 *
 * @param clients - Tool clients
 * @param skippedIds - Ids skipped this session
 * @param asTextSummary - When true, return a compact text-oriented summary
 * @returns Tool result envelope
 */
async function cookieTriagePayload(
  clients: ToolClients,
  skippedIds: string[] = [],
  asTextSummary = false,
): Promise<unknown> {
  const data = await loadCard(clients, skippedIds);
  return createToolResult(true, asTextSummary ? summarizeCard(data) : data);
}

/**
 * Resolves purpose / service overrides for a mutation from act args.
 *
 * @param args - Act tool input
 * @returns Fields to pass into mutateTriageItems
 */
function classificationFromAct(args: CookieTriageActInput): {
  purposeSlug?: string;
  purposeId?: string;
  service?: string;
} {
  return {
    ...(args.purposeSlug ? { purposeSlug: args.purposeSlug } : {}),
    ...(args.purposeId ? { purposeId: args.purposeId } : {}),
    ...(args.service ? { service: args.service } : {}),
  };
}

/**
 * App-only companion: apply a triage action and return the next card.
 *
 * Hidden from the model (`visibility: ['app']`); the view reaches it via callTool.
 *
 * @param clients - Tool clients
 * @returns Tool definition
 */
function createCookieTriageActTool(clients: ToolClients) {
  return defineTool({
    name: 'consent_cookie_triage_act',
    description:
      'Apply an approve, junk, skip, or bulk-approve action in the cookie triage app, ' +
      'then return the next review card.',
    category: 'Consent Management',
    readOnly: false,
    confirmationHint: 'Approves, junks, or skips cookies and data flows in triage',
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    zodSchema: CookieTriageActSchema,
    handler: async (args) => {
      const skippedIds = [...(args.skippedIds ?? [])];
      const reviewType = args.reviewType as CookieTriageReviewType;
      const classification = classificationFromAct(args);

      if (args.action === 'skip') {
        if (!skippedIds.includes(args.id)) {
          skippedIds.push(args.id);
        }
        return cookieTriagePayload(clients, skippedIds);
      }

      if (args.action === 'approve' || args.action === 'junk') {
        await mutateTriageItems(
          clients,
          [{ id: args.id, reviewType, ...classification }],
          args.action,
        );
        return cookieTriagePayload(clients, skippedIds);
      }

      // approve_siblings — current item plus high-confidence siblings
      const ids = [args.id, ...(args.siblingIds ?? [])];
      await mutateTriageItems(
        clients,
        ids.map((id) => ({ id, reviewType, ...classification })),
        'approve',
      );
      return cookieTriagePayload(clients, skippedIds);
    },
  });
}

/**
 * Opens an interactive cookie / data-flow triage queue.
 *
 * On hosts that support MCP Apps this renders a review card (purpose, service,
 * approve / junk, and optional bulk approve). Elsewhere it returns a compact
 * text summary of the same first card so the agent can still act with
 * `consent_bulk_triage`.
 */
export function createCookieTriageAppTool(clients: ToolClients) {
  return defineToolWithCapabilities({
    name: 'consent_cookie_triage',
    description:
      'Open the cookie and data-flow triage queue for items with status NEEDS_REVIEW. ' +
      'On hosts that support MCP Apps, renders an interactive review card for classifying ' +
      'and approving or junking trackers; otherwise returns a text summary of the next item.',
    category: 'Consent Management',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: CookieTriageAppSchema,
    handler: async ({ skippedIds }) => cookieTriagePayload(clients, skippedIds ?? [], true),
    variants: {
      [McpClientCapability.McpApp]: {
        resource: COOKIE_TRIAGE_APP_RESOURCE,
        handler: async ({ skippedIds }) => cookieTriagePayload(clients, skippedIds ?? []),
        appOnlyTools: [createCookieTriageActTool(clients)],
      },
    },
  });
}
