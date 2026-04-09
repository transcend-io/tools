import { z, PaginationSchema } from '@transcend-io/mcp-server-core';

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

export const ListPurposesSchema = PaginationSchema;
export const ListDataFlowsSchema = PaginationSchema;
export const ListAirgapBundlesSchema = PaginationSchema;
export const ListRegimesSchema = PaginationSchema;

export const ConsentTrackerStatusEnum = z.enum(['LIVE', 'NEEDS_REVIEW']);
export const OrderDirectionEnum = z.enum(['ASC', 'DESC']);

export const ListTriageCookiesSchema = z.object({
  airgap_bundle_id: z.string().describe('Airgap bundle ID (from consent_list_airgap_bundles)'),
  limit: z.number().min(1).max(200).optional().default(50),
  offset: z.number().min(0).optional().default(0),
  status: ConsentTrackerStatusEnum.optional().describe(
    'Filter by status: NEEDS_REVIEW (triage) or LIVE (approved)',
  ),
  is_junk: z.boolean().optional().describe('Filter by junk status'),
  show_zero_activity: z.boolean().optional().describe('Include items with zero activity'),
  text: z.string().optional().describe('Search text filter'),
  service: z.string().optional().describe('Filter by service name'),
  order_field: z.string().optional().describe('Field to sort by: name, createdAt, updatedAt'),
  order_direction: OrderDirectionEnum.optional().describe('Sort direction: ASC or DESC'),
});

export const ListTriageDataFlowsSchema = z.object({
  airgap_bundle_id: z.string().describe('Airgap bundle ID (from consent_list_airgap_bundles)'),
  limit: z.number().min(1).max(200).optional().default(50),
  offset: z.number().min(0).optional().default(0),
  status: ConsentTrackerStatusEnum.optional().describe(
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
  airgap_bundle_id: z.string().describe('Airgap bundle ID (from consent_list_airgap_bundles)'),
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
  airgap_bundle_id: z.string().describe('Airgap bundle ID'),
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
  airgap_bundle_id: z.string().describe('Airgap bundle ID'),
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
  airgap_bundle_id: z.string().describe('Airgap bundle ID'),
  items: z.array(BulkTriageItemSchema).min(1).describe('Items to triage'),
});

export const DeleteCookiesSchema = z.object({
  airgap_bundle_id: z.string().describe('Airgap bundle ID'),
  ids: z.array(z.string()).min(1).describe('Cookie IDs to delete'),
});

export const DeleteDataFlowsSchema = z.object({
  airgap_bundle_id: z.string().describe('Airgap bundle ID'),
  ids: z.array(z.string()).min(1).describe('Data flow IDs to delete'),
});

export type GetPreferencesInput = z.infer<typeof GetPreferencesSchema>;
export type PurposeConsentInput = z.infer<typeof PurposeConsentSchema>;
export type SetPreferencesInput = z.infer<typeof SetPreferencesSchema>;
export type ListPurposesInput = z.infer<typeof ListPurposesSchema>;
export type ListDataFlowsInput = z.infer<typeof ListDataFlowsSchema>;
export type ListAirgapBundlesInput = z.infer<typeof ListAirgapBundlesSchema>;
export type ListRegimesInput = z.infer<typeof ListRegimesSchema>;
export type ListTriageCookiesInput = z.infer<typeof ListTriageCookiesSchema>;
export type ListTriageDataFlowsInput = z.infer<typeof ListTriageDataFlowsSchema>;
export type GetCookieStatsInput = z.infer<typeof GetCookieStatsSchema>;
export type UpdateCookiesInput = z.infer<typeof UpdateCookiesSchema>;
export type UpdateDataFlowsInput = z.infer<typeof UpdateDataFlowsSchema>;
export type BulkTriageInput = z.infer<typeof BulkTriageSchema>;
