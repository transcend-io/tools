import { z } from '@transcend-io/mcp-server-base';

export const IdentifierSchema = z.object({
  name: z.string().describe('Identifier name (e.g. email, phone)'),
  value: z.string().describe('Identifier value'),
});
export type IdentifierInput = z.infer<typeof IdentifierSchema>;

export const IdentifierOptionsSchema = z
  .object({
    mergeRecordsOnConflict: z
      .boolean()
      .optional()
      .describe('Merge records when an identifier value conflicts'),
    returnIdentifiers: z
      .boolean()
      .optional()
      .describe('Return remaining identifiers in the response'),
  })
  .describe('Optional flags for identifier mutation operations');

export const DeleteIdentifierOptionsSchema = z
  .object({
    returnIdentifiers: z
      .boolean()
      .optional()
      .describe('Return remaining identifiers in the response'),
  })
  .describe('Optional flags for identifier deletion operations');

export const UpsertPurposeSchema = z.object({
  purpose: z.string().describe('Purpose slug'),
  consent: z
    .union([z.boolean(), z.literal('NOTSET')])
    .describe('Consent value (true, false, or NOTSET)'),
  timestamp: z.string().optional().describe('ISO 8601 timestamp for this purpose'),
});

export const UpsertRecordSchema = z.object({
  partition: z.string().describe('Preference store partition key'),
  timestamp: z.string().describe('ISO 8601 timestamp for the consent update'),
  confirmed: z.boolean().optional().describe('Whether consent was explicitly confirmed'),
  identifiers: z.array(IdentifierSchema).optional().describe('User identifiers'),
  userId: z.string().optional().describe('Legacy user ID (prefer identifiers)'),
  purposes: z.array(UpsertPurposeSchema).describe('Purpose consent updates'),
});

export const DeleteRecordSchema = z.object({
  anchorIdentifier: IdentifierSchema.describe('Anchor identifier locating the record'),
  timestamp: z.string().describe('ISO 8601 timestamp for the deletion'),
});

export const AppendRecordSchema = z.object({
  anchorIdentifier: IdentifierSchema.describe('Anchor identifier locating the record'),
  append: IdentifierSchema.describe('Identifier to append'),
  timestamp: z.string().describe('ISO 8601 timestamp for the update'),
  options: IdentifierOptionsSchema.optional(),
});

export const UpdateRecordSchema = z.object({
  anchorIdentifier: IdentifierSchema.describe('Anchor identifier locating the record'),
  update: z
    .object({
      name: z.string().describe('Identifier name'),
      oldValue: z.string().describe('Current identifier value'),
      newValue: z.string().describe('New identifier value'),
    })
    .describe('Identifier update details'),
  timestamp: z.string().describe('ISO 8601 timestamp for the update'),
  options: IdentifierOptionsSchema.optional(),
});

export const DeleteIdentifierRecordSchema = z.object({
  anchorIdentifier: IdentifierSchema.describe('Anchor identifier locating the record'),
  delete: IdentifierSchema.describe('Identifier to delete'),
  timestamp: z.string().describe('ISO 8601 timestamp for the update'),
  options: DeleteIdentifierOptionsSchema.optional(),
});
