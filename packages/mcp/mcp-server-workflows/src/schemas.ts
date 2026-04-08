import { z, PaginationSchema } from '@transcend-io/mcp-server-core';

export const ListWorkflowsSchema = PaginationSchema;

export const UpdateWorkflowConfigSchema = z.object({
  workflow_config_id: z.string(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  show_in_privacy_center: z.boolean().optional(),
});

export const ListEmailTemplatesSchema = PaginationSchema.extend({
  offset: z.coerce.number().min(0).optional().default(0),
});

export type ListWorkflowsInput = z.infer<typeof ListWorkflowsSchema>;
export type UpdateWorkflowConfigInput = z.infer<typeof UpdateWorkflowConfigSchema>;
export type ListEmailTemplatesInput = z.infer<typeof ListEmailTemplatesSchema>;
