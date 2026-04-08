import { z, PaginationSchema } from '@transcend-io/mcp-server-core';

export const EmptySchema = z.object({});

export const ListUsersSchema = PaginationSchema;

export const ListTeamsSchema = PaginationSchema;

export const ListApiKeysSchema = PaginationSchema.extend({
  offset: z.coerce.number().min(0).optional().default(0),
});

export const CreateApiKeySchema = z.object({
  title: z.string(),
  scopes: z.array(z.string()),
  data_silos: z.array(z.string()).optional(),
});

export type EmptyInput = z.infer<typeof EmptySchema>;
export type ListUsersInput = z.infer<typeof ListUsersSchema>;
export type ListTeamsInput = z.infer<typeof ListTeamsSchema>;
export type ListApiKeysInput = z.infer<typeof ListApiKeysSchema>;
export type CreateApiKeyInput = z.infer<typeof CreateApiKeySchema>;
