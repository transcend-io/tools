import { z } from '@transcend-io/mcp-server-core';
import { ConsentTrackerStatus, OrderDirection } from '@transcend-io/privacy-types';

export const ConsentTrackerStatusEnum = z.nativeEnum(ConsentTrackerStatus);
export const OrderDirectionEnum = z.nativeEnum(OrderDirection);

export const GetPreferencesSchema = z.object({
  identifier: z.string(),
  partition: z.string().optional(),
});

export const PurposeConsentSchema = z.object({
  purpose: z.string(),
  enabled: z.boolean(),
});

export const SetPreferencesSchema = z.object({
  identifier: z.string().optional(),
  partition: z.string(),
  purposes: z.array(PurposeConsentSchema),
  confirmed: z.boolean().optional(),
});

export const ListPurposesSchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
});

export const ListRegimesSchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
});

export const ListCookiesSchema = z.object({
  limit: z.number().min(1).max(200).optional().default(50),
  offset: z.number().min(0).optional().default(0),
  status: ConsentTrackerStatusEnum.describe(
    'Filter by status: NEEDS_REVIEW (triage) or LIVE (approved)',
  ),
  is_junk: z.boolean().optional().describe('Filter by junk status'),
  show_zero_activity: z.boolean().optional().describe('Include items with zero activity'),
  text: z.string().optional().describe('Search text filter'),
  service: z.string().optional().describe('Filter by service name'),
  order_field: z.string().optional().describe('Field to sort by: name, createdAt, updatedAt'),
  order_direction: OrderDirectionEnum.optional().describe('Sort direction: ASC or DESC'),
});

export const ListDataFlowsSchema = z.object({
  limit: z.number().min(1).max(200).optional().default(50),
  offset: z.number().min(0).optional().default(0),
  status: ConsentTrackerStatusEnum.describe(
    'Filter by status: NEEDS_REVIEW (triage) or LIVE (approved)',
  ),
  is_junk: z.boolean().optional().describe('Filter by junk status'),
  show_zero_activity: z.boolean().optional().describe('Include items with zero activity'),
  text: z.string().optional().describe('Search text filter'),
  service: z.string().optional().describe('Filter by service name'),
  order_field: z
    .string()
    .optional()
    .describe('Field to sort by: value, createdAt, updatedAt, occurrences, service'),
  order_direction: OrderDirectionEnum.optional().describe('Sort direction: ASC or DESC'),
});

export const GetCookieStatsSchema = z.object({
  show_zero_activity: z.boolean().optional().describe('Include items with zero activity in counts'),
});

export const UpdateCookieItemSchema = z.object({
  name: z.string().describe('Cookie name (used as the identifier for upsert)'),
  tracking_purposes: z
    .array(z.string())
    .optional()
    .describe('Tracking purpose slugs (e.g., "Advertising", "Analytics")'),
  description: z.string().optional(),
  service: z.string().optional().describe('Service/integration name'),
  is_junk: z.boolean().optional().describe('Mark as junk'),
  status: ConsentTrackerStatusEnum.optional().describe(
    'Set status to LIVE (approve) or NEEDS_REVIEW',
  ),
});

export const UpdateCookiesSchema = z.object({
  cookies: z.array(UpdateCookieItemSchema).min(1).describe('Cookies to update'),
});

export const UpdateDataFlowItemSchema = z.object({
  id: z.string().describe('Data flow ID'),
  tracking_purposes: z.array(z.string()).optional().describe('Tracking purpose slugs'),
  description: z.string().optional(),
  service: z.string().optional().describe('Service/integration name'),
  is_junk: z.boolean().optional().describe('Mark as junk'),
  status: ConsentTrackerStatusEnum.optional().describe(
    'Set status to LIVE (approve) or NEEDS_REVIEW',
  ),
});

export const UpdateDataFlowsSchema = z.object({
  data_flows: z.array(UpdateDataFlowItemSchema).min(1).describe('Data flows to update'),
});

export const TriageActionEnum = z.enum(['APPROVE', 'JUNK']);

export const BulkTriageItemSchema = z.object({
  type: z.enum(['cookie', 'data_flow']).describe('Item type'),
  id: z.string().describe('Item ID (for data flows) or cookie name (for cookies)'),
  action: TriageActionEnum.describe('Action to take: APPROVE or JUNK'),
  tracking_purposes: z
    .array(z.string())
    .optional()
    .describe('Tracking purposes to assign (required when approving)'),
  service: z.string().optional().describe('Service name to assign'),
});

export const BulkTriageSchema = z.object({
  items: z.array(BulkTriageItemSchema).min(1).describe('Items to triage'),
});

export const ListAirgapBundlesSchema = z.object({});
