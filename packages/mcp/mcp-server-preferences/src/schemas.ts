import { z } from '@transcend-io/mcp-server-core';

const IdentifierSchema = z.object({
  value: z.string(),
  type: z.string().optional(),
});

export const QueryPreferencesSchema = z.object({
  partition: z.string(),
  identifiers: z.array(IdentifierSchema),
});

export const UpsertPreferencesSchema = z.object({
  partition: z.string(),
  records: z.array(
    z.object({
      identifier: z.string(),
      identifierType: z.string().optional(),
      purposes: z.array(
        z.object({
          purpose: z.string(),
          enabled: z.boolean(),
        }),
      ),
      confirmed: z.boolean().optional(),
    }),
  ),
});

export const DeletePreferencesSchema = z.object({
  partition: z.string(),
  identifiers: z.array(IdentifierSchema),
});

export const AppendIdentifiersSchema = z.object({
  partition: z.string(),
  user_id: z.string(),
  identifiers: z.array(IdentifierSchema),
});

export const UpdateIdentifiersSchema = z.object({
  partition: z.string(),
  user_id: z.string(),
  identifiers: z.array(
    z.object({
      oldValue: z.string(),
      newValue: z.string(),
      type: z.string().optional(),
    }),
  ),
});

export const DeleteIdentifiersSchema = z.object({
  partition: z.string(),
  user_id: z.string(),
  identifiers: z.array(IdentifierSchema),
});

export type QueryPreferencesInput = z.infer<typeof QueryPreferencesSchema>;
export type UpsertPreferencesInput = z.infer<typeof UpsertPreferencesSchema>;
export type DeletePreferencesInput = z.infer<typeof DeletePreferencesSchema>;
export type AppendIdentifiersInput = z.infer<typeof AppendIdentifiersSchema>;
export type UpdateIdentifiersInput = z.infer<typeof UpdateIdentifiersSchema>;
export type DeleteIdentifiersInput = z.infer<typeof DeleteIdentifiersSchema>;
