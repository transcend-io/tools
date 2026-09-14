import { RequestAction } from '@transcend-io/privacy-types';
import { createSombraGotInstance } from '@transcend-io/sdk';
import colors from 'colors';
import * as t from 'io-ts';

import { DEFAULT_TRANSCEND_API } from '../../constants.js';
import { logger } from '../../logger.js';
import { readCsv } from '../requests/readCsv.js';

/**
 * File 2 columns that carry structured meaning and are therefore never
 * treated as custom identifier columns.
 */
const RESERVED_COLUMNS = new Set([
  'drop_record_id',
  'drop_list_type',
  'person_key',
  'email',
  'phone',
  'core_identifier',
  'status_override',
]);

/** A single CPPA DROP record `(id, list type)` a request covers. */
interface DropRecordRef {
  /** The CPPA DROP record id from File 1 */
  dropRecordId: number;
  /** The CPPA list type the record came from */
  dropListType: string;
}

/** One person's collapsed set of matched DROP records + routing identifiers. */
interface GroupedDropPerson {
  /** Routing core identifier for the erasure. */
  coreIdentifier: string;
  /** Routing email, if any row for this person carried one. */
  email?: string;
  /** phone + custom identifier values, keyed by column name. */
  attestedExtraIdentifiers: Record<string, { value: string }[]>;
  /** Every `(dropRecordId, dropListType)` pair this person matched. */
  dropRecords: DropRecordRef[];
}

/** A bulk-ingress item (matches `EmployeeDsrBulkIngressItemInput`). */
interface DropBulkItem {
  /** Attested auth context; Sombra signs the identifiers server-side. */
  attestedAuthContext: {
    /** Type of data subject. */
    subjectType: string;
    /** Routing core identifier. */
    coreIdentifier: string;
    /** Routing email, if present. */
    email?: string;
    /** phone + custom identifiers. */
    attestedExtraIdentifiers?: Record<string, { value: string }[]>;
  };
  /** Always erasure for DROP. */
  actionType: RequestAction;
  /** The DROP run these records belong to. */
  dropRunId: string;
  /** The CPPA DROP records this DSR covers. */
  dropRecords: DropRecordRef[];
}

/**
 * Upload a DROP File 2 (matched records) as erasure DSRs.
 *
 * File 2 has one row per matched `(drop_record_id, drop_list_type)`. Rows are
 * grouped by `person_key` so each person becomes a single erasure DSR carrying
 * all of their DROP record ids. Collapsing is required, not an optimization:
 * customers are billed per workflow run (= per DSR), duplicate DSRs for the
 * same person fail downstream, and infra load scales with DSR count.
 *
 * Requests are submitted through the Sombra bulk DSR ingress
 * (`POST /v1/data-subject-request-bulk`), which carries the DROP linkage
 * (`dropRecords` + `dropRunId`) so report-back ties each record id back to the
 * covering request.
 *
 * @param options - File path, run id, auth, and submission options
 */
export async function uploadDropFile2({
  file,
  dropRunId,
  auth,
  sombraAuth,
  transcendUrl = DEFAULT_TRANSCEND_API,
  batchSize = 100,
  dryRun = false,
}: {
  /** Path to the File 2 CSV */
  file: string;
  /** The DROP run id these matched records belong to */
  dropRunId: string;
  /** Transcend API key */
  auth: string;
  /** Sombra internal key, when self-hosting Sombra */
  sombraAuth?: string;
  /** Transcend backend URL */
  transcendUrl?: string;
  /** Number of DSRs per bulk request */
  batchSize?: number;
  /** When true, parse and group but do not submit */
  dryRun?: boolean;
}): Promise<void> {
  const rows = readCsv(file, t.record(t.string, t.string));
  if (rows.length === 0) {
    throw new Error(`No rows found in DROP File 2 at ${file}`);
  }

  // Group by person_key so one person => one DSR covering all their records.
  const groups = new Map<string, GroupedDropPerson>();
  let skippedOverrides = 0;
  let skippedInvalid = 0;
  let ungroupedCounter = 0;

  for (const row of rows) {
    const dropRecordIdRaw = (row.drop_record_id ?? '').trim();
    const dropListType = (row.drop_list_type ?? '').trim();
    if (!dropRecordIdRaw || !dropListType || !Number.isFinite(Number(dropRecordIdRaw))) {
      skippedInvalid += 1;
      continue;
    }

    // status_override rows report a CPPA status directly and do not open a
    // DSR. Not handled by this command yet — surface them so the operator
    // knows to reconcile via the dashboard.
    if ((row.status_override ?? '').trim() !== '') {
      skippedOverrides += 1;
      continue;
    }

    const personKey = (row.person_key ?? '').trim();
    const email = (row.email ?? '').trim();
    const phone = (row.phone ?? '').trim();
    const coreIdentifier =
      (row.core_identifier ?? '').trim() ||
      personKey ||
      email ||
      phone ||
      `drop:${dropRecordIdRaw}`;

    // Rows sharing a person_key collapse; a row with no person_key becomes its
    // own DSR (synthetic unique key).
    const groupKey = personKey || `__ungrouped_${(ungroupedCounter += 1)}`;

    let group = groups.get(groupKey);
    if (!group) {
      group = {
        coreIdentifier,
        attestedExtraIdentifiers: {},
        dropRecords: [],
      };
      groups.set(groupKey, group);
    }

    if (email && !group.email) {
      group.email = email;
    }

    // phone + any custom identifier columns become attested extra identifiers.
    for (const [column, rawValue] of Object.entries(row)) {
      const value = (rawValue ?? '').trim();
      if (!value || column === 'email') {
        continue;
      }
      const isCustomIdentifier = column === 'phone' || !RESERVED_COLUMNS.has(column);
      if (!isCustomIdentifier) {
        continue;
      }
      const existing = group.attestedExtraIdentifiers[column] ?? [];
      if (!existing.some((entry) => entry.value === value)) {
        existing.push({ value });
      }
      group.attestedExtraIdentifiers[column] = existing;
    }

    group.dropRecords.push({
      dropRecordId: Number(dropRecordIdRaw),
      dropListType,
    });
  }

  const items: DropBulkItem[] = [...groups.values()].map((group) => ({
    attestedAuthContext: {
      subjectType: 'customer',
      coreIdentifier: group.coreIdentifier,
      ...(group.email ? { email: group.email } : {}),
      ...(Object.keys(group.attestedExtraIdentifiers).length > 0
        ? { attestedExtraIdentifiers: group.attestedExtraIdentifiers }
        : {}),
    },
    actionType: RequestAction.Erasure,
    dropRunId,
    dropRecords: group.dropRecords,
  }));

  logger.info(
    colors.magenta(
      `Parsed ${rows.length} File 2 rows into ${items.length} DSRs (grouped by person_key) for DROP run ${dropRunId}.`,
    ),
  );
  if (skippedOverrides > 0) {
    logger.info(
      colors.yellow(
        `Skipped ${skippedOverrides} status_override row(s) — reconcile those directly in the dashboard.`,
      ),
    );
  }
  if (skippedInvalid > 0) {
    logger.info(
      colors.yellow(
        `Skipped ${skippedInvalid} row(s) missing a valid drop_record_id/drop_list_type.`,
      ),
    );
  }

  if (dryRun) {
    logger.info(colors.yellow('Dry run — not submitting. First DSR that would be created:'));
    logger.info(JSON.stringify(items[0], null, 2));
    return;
  }

  const sombra = await createSombraGotInstance(transcendUrl, auth, {
    logger,
    sombraApiKey: sombraAuth,
    sombraUrl: process.env.SOMBRA_URL,
  });

  let submitted = 0;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    try {
      // eslint-disable-next-line no-await-in-loop
      await sombra.post('v1/data-subject-request-bulk', { json: { input: batch } }).json();
    } catch (err) {
      const body = (err as { response?: { body?: unknown } })?.response?.body;
      const message = (err as { message?: string })?.message;
      throw new Error(
        `Failed submitting DROP DSR batch (items ${i}–${i + batch.length}): ${
          body ?? message ?? 'unknown error'
        }`,
      );
    }
    submitted += batch.length;
    logger.info(colors.green(`Submitted ${submitted}/${items.length} DSRs`));
  }

  logger.info(colors.green(`Done. Created ${submitted} DROP erasure DSR(s) for run ${dropRunId}.`));
}
