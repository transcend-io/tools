import { z, PaginationSchema } from '@transcend-io/mcp-server-core';

export const REQUEST_TYPES = [
  'ACCESS',
  'ERASURE',
  'RECTIFICATION',
  'RESTRICTION',
  'SALE_OPT_OUT',
  'SALE_OPT_IN',
  'CONTACT_OPT_OUT',
  'CONTACT_OPT_IN',
  'AUTOMATED_DECISION_MAKING_OPT_OUT',
  'AUTOMATED_DECISION_MAKING_OPT_IN',
  'USE_OF_SENSITIVE_INFORMATION_OPT_OUT',
  'USE_OF_SENSITIVE_INFORMATION_OPT_IN',
  'TRACKING_OPT_OUT',
  'TRACKING_OPT_IN',
  'CUSTOM_OPT_OUT',
  'CUSTOM_OPT_IN',
  'BUSINESS_PURPOSE',
  'PLACE_ON_LEGAL_HOLD',
  'REMOVE_FROM_LEGAL_HOLD',
] as const;

export const RequestTypeEnum = z.enum(REQUEST_TYPES);

export const SubmitDSRSchema = z.object({
  type: RequestTypeEnum,
  email: z.string(),
  subjectType: z.string(),
  coreIdentifier: z.string().optional(),
  name: z.string().optional(),
  locale: z.string().optional(),
  isSilent: z.boolean().optional(),
});

export const PollStatusSchema = z.object({
  request_id: z.string(),
});

export const ListDSRSchema = PaginationSchema;

export const GetDetailsSchema = z.object({
  request_id: z.string(),
});

export const DownloadKeysSchema = z.object({
  request_id: z.string(),
});

export const ListIdentifiersSchema = z
  .object({
    request_id: z.string(),
  })
  .merge(PaginationSchema);

export const EnrichIdentifiersSchema = z.object({
  request_id: z.string(),
  identifiers: z.record(z.string(), z.string()),
});

export const RespondAccessSchema = z.object({
  request_id: z.string(),
  data_silo_id: z.string(),
  profiles: z.array(z.record(z.string(), z.unknown())).optional(),
});

export const RespondErasureSchema = z.object({
  request_id: z.string(),
  data_silo_id: z.string(),
  profile_ids: z.array(z.string()).optional(),
});

export const CancelDSRSchema = z.object({
  request_id: z.string(),
  reason: z.string().optional(),
});

export const EmployeeSubmitDSRSchema = z.object({
  type: RequestTypeEnum,
  email: z.string(),
  subjectType: z.string(),
  coreIdentifier: z.string().optional(),
  locale: z.string().optional(),
  isSilent: z.boolean().optional(),
});

export const AnalyzeDSRSchema = z.object({
  days: z.coerce.number().optional(),
});

export type SubmitDSRInput = z.infer<typeof SubmitDSRSchema>;
export type PollStatusInput = z.infer<typeof PollStatusSchema>;
export type ListDSRInput = z.infer<typeof ListDSRSchema>;
export type GetDetailsInput = z.infer<typeof GetDetailsSchema>;
export type DownloadKeysInput = z.infer<typeof DownloadKeysSchema>;
export type ListIdentifiersInput = z.infer<typeof ListIdentifiersSchema>;
export type EnrichIdentifiersInput = z.infer<typeof EnrichIdentifiersSchema>;
export type RespondAccessInput = z.infer<typeof RespondAccessSchema>;
export type RespondErasureInput = z.infer<typeof RespondErasureSchema>;
export type CancelDSRInput = z.infer<typeof CancelDSRSchema>;
export type EmployeeSubmitDSRInput = z.infer<typeof EmployeeSubmitDSRSchema>;
export type AnalyzeDSRInput = z.infer<typeof AnalyzeDSRSchema>;
