import { z, PaginationSchema } from '@transcend-io/mcp-server-core';

export const ClassifyTextSchema = z.object({
  texts: z.array(z.string()),
  categories: z.array(z.string()).optional(),
  model: z.string().optional(),
});

export const NerExtractSchema = z.object({
  text: z.string(),
  entity_types: z.array(z.string()).optional(),
});

export const ListScansSchema = PaginationSchema;

export const StartScanSchema = z.object({
  name: z.string(),
  data_silo_id: z.string().optional(),
  type: z.string().optional(),
});

export const GetScanSchema = z.object({
  scan_id: z.string(),
});

export const ListPluginsSchema = PaginationSchema;

export type ClassifyTextInput = z.infer<typeof ClassifyTextSchema>;
export type NerExtractInput = z.infer<typeof NerExtractSchema>;
export type ListScansInput = z.infer<typeof ListScansSchema>;
export type StartScanInput = z.infer<typeof StartScanSchema>;
export type GetScanInput = z.infer<typeof GetScanSchema>;
export type ListPluginsInput = z.infer<typeof ListPluginsSchema>;
