import { z } from '@transcend-io/mcp-server-base';

/** Shared describe for Preference Store `partition` inputs on preferences_* tools */
export const PARTITION_DESCRIBE =
  'Preference Store partition key for the Sombra path. Call preferences_list_partitions first; ' +
  'use the returned partition string (bundle UUID or custom slug), not the organization id. ' +
  'Prefer the row with isEffectiveForConsentManager unless the user named another partition.';

/** Preference Store timestamps must include millisecond precision in UTC. */
export const TIMESTAMP_DESCRIBE =
  'UTC ISO 8601 timestamp with milliseconds (e.g. 2024-01-15T10:30:00.000Z). ' +
  'Preference Store rejects variants without milliseconds (e.g. ...00Z).';

/**
 * Shared describe for mergeRecordsOnConflict on upsert and identifier mutations.
 * Preference Store defaults to true when the flag is omitted.
 */
export const MERGE_RECORDS_ON_CONFLICT_DESCRIBE =
  'When identifiers match two different existing records: true merges them ' +
  '(API default if omitted); false fails the record with a conflict error. ' +
  'Pass false unless the caller intends to combine profiles.';

export const IdentifierSchema = z.object({
  name: z.string().describe('Identifier name (e.g. email, phone)'),
  value: z
    .string()
    .describe(
      'Identifier value. For name "phone", use E.164 (e.g. +14155550101), not national formats like +1-555-0101.',
    ),
});
export type IdentifierInput = z.infer<typeof IdentifierSchema>;

export const IdentifierOptionsSchema = z
  .object({
    mergeRecordsOnConflict: z.boolean().optional().describe(MERGE_RECORDS_ON_CONFLICT_DESCRIBE),
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

/** Per-record options for PUT /v1/preferences (no returnIdentifiers). */
export const UpsertRecordOptionsSchema = z
  .object({
    mergeRecordsOnConflict: z.boolean().optional().describe(MERGE_RECORDS_ON_CONFLICT_DESCRIBE),
  })
  .describe('Optional flags for upsert conflict handling');

export const UpsertPurposeSchema = z.object({
  purpose: z.string().describe('Purpose slug'),
  enabled: z
    .boolean()
    .describe(
      'Whether the purpose is enabled (Preference Store PUT /v1/preferences field name). ' +
        'Do not send "consent" — the API expects enabled: boolean.',
    ),
  timestamp: z.string().optional().describe(TIMESTAMP_DESCRIBE),
});

export const UpsertRecordSchema = z.object({
  partition: z.string().describe(PARTITION_DESCRIBE),
  timestamp: z.string().describe(TIMESTAMP_DESCRIBE),
  confirmed: z.boolean().optional().describe('Whether consent was explicitly confirmed'),
  identifiers: z.array(IdentifierSchema).optional().describe('User identifiers'),
  userId: z.string().optional().describe('Legacy user ID (prefer identifiers)'),
  purposes: z.array(UpsertPurposeSchema).describe('Purpose consent updates'),
  options: UpsertRecordOptionsSchema.optional(),
});

export const DeleteRecordSchema = z.object({
  anchorIdentifier: IdentifierSchema.describe('Anchor identifier locating the record'),
  timestamp: z.string().describe(TIMESTAMP_DESCRIBE),
});

export const AppendRecordSchema = z.object({
  anchorIdentifier: IdentifierSchema.describe('Anchor identifier locating the record'),
  append: IdentifierSchema.describe('Identifier to append'),
  timestamp: z.string().describe(TIMESTAMP_DESCRIBE),
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
  timestamp: z.string().describe(TIMESTAMP_DESCRIBE),
  options: IdentifierOptionsSchema.optional(),
});

export const DeleteIdentifierRecordSchema = z.object({
  anchorIdentifier: IdentifierSchema.describe('Anchor identifier locating the record'),
  delete: IdentifierSchema.describe('Identifier to delete'),
  timestamp: z.string().describe(TIMESTAMP_DESCRIBE),
  options: DeleteIdentifierOptionsSchema.optional(),
});
