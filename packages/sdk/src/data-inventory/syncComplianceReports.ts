import { mapSeries, type Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';
import { isEqual, keyBy } from 'lodash-es';

import { fetchAllUsers } from '../administration/fetchAllUsers.js';
import { makeGraphQLRequest, NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import { resolveComplianceReportColumns } from './complianceReportDefaults.js';
import {
  fetchAllComplianceReports,
  type ComplianceReport,
  type ComplianceReportProcessingActivitiesFilter,
} from './fetchAllComplianceReports.js';
import {
  CREATE_COMPLIANCE_REPORT,
  DELETE_COMPLIANCE_REPORTS,
  REPROCESS_COMPLIANCE_REPORT,
  UPDATE_COMPLIANCE_REPORT,
} from './gqls/complianceReport.js';

export interface ComplianceReportInput {
  /** The title of the compliance report (idempotency key) */
  title: string;
  /** Description of the compliance report */
  description?: string;
  /**
   * Filter for which processing activities to include.
   * Prefer `text` for portable YAML; ID-based filters are org-specific.
   */
  'processing-activities-filter'?: ComplianceReportProcessingActivitiesFilter;
  /**
   * Columns of the report in order.
   * Each entry is a ProcessingActivitiesColumnName value or an attribute-key UUID.
   * Empty / omitted → Article 30 defaults (see resolveComplianceReportColumns).
   */
  columns?: string[];
  /** Email of the data protection officer (resolved to user ID on push) */
  'data-protection-officer-email'?: string;
}

/**
 * Convert YAML kebab-case filter to GraphQL camelCase input.
 *
 * @param filter - YAML filter
 * @returns GraphQL ProcessingActivitiesFiltersInput
 */
export function toGraphQLProcessingActivitiesFilter(
  filter: ComplianceReportProcessingActivitiesFilter | undefined,
): ComplianceReportProcessingActivitiesFilter | undefined {
  if (!filter) {
    return undefined;
  }
  // Strip undefined / empty values so create/update payloads stay clean
  return Object.fromEntries(
    Object.entries(filter).filter(([, value]) => {
      if (value === undefined || value === null) {
        return false;
      }
      if (typeof value === 'string') {
        return value.length > 0;
      }
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return true;
    }),
  ) as ComplianceReportProcessingActivitiesFilter;
}

/**
 * Whether an existing report's filter matches the desired YAML filter.
 *
 * @param existing - Parsed filter on the report
 * @param desired - Desired filter from YAML
 * @returns True when filters are equivalent
 */
function filtersMatch(
  existing: ComplianceReportProcessingActivitiesFilter,
  desired: ComplianceReportProcessingActivitiesFilter | undefined,
): boolean {
  const normalizedDesired = toGraphQLProcessingActivitiesFilter(desired) ?? {};
  const normalizedExisting = toGraphQLProcessingActivitiesFilter(existing) ?? {};
  return isEqual(normalizedExisting, normalizedDesired);
}

/**
 * Create a compliance report
 *
 * @param client - GraphQL client
 * @param input - Input
 * @param options - Options
 * @returns Created report id/title
 */
async function createComplianceReport(
  client: GraphQLClient,
  input: ComplianceReportInput,
  options: {
    /** Logger instance */
    logger?: Logger;
    /** Resolved DPO user ID */
    dataProtectionOfficerId?: string;
  } = {},
): Promise<Pick<ComplianceReport, 'id' | 'title'>> {
  const { logger = NOOP_LOGGER, dataProtectionOfficerId } = options;
  const columns = resolveComplianceReportColumns(input.columns);
  const processingActivitiesFilter = toGraphQLProcessingActivitiesFilter(
    input['processing-activities-filter'],
  );

  const { createComplianceReport } = await makeGraphQLRequest<{
    /** Create mutation */
    createComplianceReport: {
      /** Created report */
      complianceReport: Pick<ComplianceReport, 'id' | 'title'>;
    };
  }>(client, CREATE_COMPLIANCE_REPORT, {
    variables: {
      input: {
        title: input.title,
        description: input.description,
        columns,
        ...(processingActivitiesFilter ? { processingActivitiesFilter } : {}),
        ...(dataProtectionOfficerId ? { dataProtectionOfficerId } : {}),
      },
    },
    logger,
  });
  return createComplianceReport.complianceReport;
}

/**
 * Update compliance report metadata fields that support UpdateComplianceReportInput.
 *
 * @param client - GraphQL client
 * @param reportId - Report ID
 * @param fieldName - Meta field name
 * @param value - New value(s)
 * @param options - Options
 */
async function updateComplianceReportField(
  client: GraphQLClient,
  reportId: string,
  fieldName: 'title' | 'description' | 'dataProtectionOfficer',
  value: string[],
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<void> {
  const { logger = NOOP_LOGGER } = options;
  await makeGraphQLRequest(client, UPDATE_COMPLIANCE_REPORT, {
    variables: {
      input: {
        id: reportId,
        fieldName,
        value,
      },
    },
    logger,
  });
}

/**
 * Reprocess (recreate) a compliance report from its stored filter/columns.
 *
 * @param client - GraphQL client
 * @param reportId - Report ID
 * @param options - Options
 */
async function reprocessComplianceReport(
  client: GraphQLClient,
  reportId: string,
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<void> {
  const { logger = NOOP_LOGGER } = options;
  await makeGraphQLRequest(client, REPROCESS_COMPLIANCE_REPORT, {
    variables: {
      input: {
        id: reportId,
        recreate: true,
      },
    },
    logger,
  });
}

/**
 * Delete compliance reports by ID.
 *
 * @param client - GraphQL client
 * @param ids - Report IDs
 * @param options - Options
 */
async function deleteComplianceReports(
  client: GraphQLClient,
  ids: string[],
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<void> {
  const { logger = NOOP_LOGGER } = options;
  if (ids.length === 0) {
    return;
  }
  await makeGraphQLRequest(client, DELETE_COMPLIANCE_REPORTS, {
    variables: { input: { ids } },
    logger,
  });
}

/**
 * Sync compliance reports from transcend.yml (idempotent by title).
 *
 * Create path: createComplianceReport with columns (Article 30 defaults if empty).
 * Update path: update description/DPO via updateComplianceReport; reprocess to refresh rows.
 * When filter or columns differ, delete + recreate (those fields are immutable after create).
 *
 * @param client - GraphQL client
 * @param inputs - YAML inputs
 * @param options - Options
 * @returns True if run without error
 */
export async function syncComplianceReports(
  client: GraphQLClient,
  inputs: ComplianceReportInput[],
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<boolean> {
  const { logger = NOOP_LOGGER } = options;
  let encounteredError = false;

  logger.info(`Syncing "${inputs.length}" compliance reports...`);
  const [existingReports, users] = await Promise.all([
    fetchAllComplianceReports(client, { logger, includeColumns: true }),
    inputs.some((input) => input['data-protection-officer-email'])
      ? fetchAllUsers(client, { logger })
      : Promise.resolve([]),
  ]);

  const reportByTitle = keyBy(existingReports, 'title') as Record<string, ComplianceReport>;
  const userByEmail = keyBy(
    users.map((user) => ({ ...user, email: user.email.toLowerCase() })),
    'email',
  );

  await mapSeries(inputs, async (input) => {
    const existing = reportByTitle[input.title];
    const dpoEmail = input['data-protection-officer-email']?.toLowerCase();
    let dataProtectionOfficerId: string | undefined;
    if (dpoEmail) {
      const user = userByEmail[dpoEmail];
      if (!user) {
        encounteredError = true;
        logger.error(
          `Failed to sync compliance report "${input.title}": ` +
            `data-protection-officer-email "${input['data-protection-officer-email']}" not found in organization`,
        );
        return;
      }
      dataProtectionOfficerId = user.id;
    }

    const desiredColumns = resolveComplianceReportColumns(input.columns);
    const desiredFilter = toGraphQLProcessingActivitiesFilter(
      input['processing-activities-filter'],
    );

    if (!existing) {
      try {
        const created = await createComplianceReport(client, input, {
          logger,
          dataProtectionOfficerId,
        });
        reportByTitle[created.title] = {
          ...created,
          description: input.description,
          processingActivitiesFilter: desiredFilter ?? {},
          processingActivitiesFilterRaw: JSON.stringify(desiredFilter ?? {}),
          dataProtectionOfficer: dataProtectionOfficerId
            ? { id: dataProtectionOfficerId, email: dpoEmail! }
            : null,
          columns: desiredColumns,
        };
        logger.info(`Successfully created compliance report "${input.title}"!`);
      } catch (err) {
        encounteredError = true;
        logger.error(
          `Failed to create compliance report "${input.title}"! - ${(err as Error).message}`,
        );
      }
      return;
    }

    try {
      const columnsMatch =
        desiredColumns.length === existing.columns.length &&
        desiredColumns.every((column, index) => column === existing.columns[index]);
      const filterOk = filtersMatch(existing.processingActivitiesFilter, desiredFilter);

      if (!columnsMatch || !filterOk) {
        logger.info(
          `Compliance report "${input.title}" filter/columns changed; deleting and recreating...`,
        );
        await deleteComplianceReports(client, [existing.id], { logger });
        const created = await createComplianceReport(client, input, {
          logger,
          dataProtectionOfficerId,
        });
        reportByTitle[created.title] = {
          ...created,
          description: input.description,
          processingActivitiesFilter: desiredFilter ?? {},
          processingActivitiesFilterRaw: JSON.stringify(desiredFilter ?? {}),
          dataProtectionOfficer: dataProtectionOfficerId
            ? { id: dataProtectionOfficerId, email: dpoEmail! }
            : null,
          columns: desiredColumns,
        };
        logger.info(`Successfully recreated compliance report "${input.title}"!`);
        return;
      }

      // Update description when changed
      if ((input.description ?? '') !== (existing.description ?? '')) {
        await updateComplianceReportField(
          client,
          existing.id,
          'description',
          [input.description ?? ''],
          { logger },
        );
      }

      // Update DPO when changed
      const existingDpoEmail = existing.dataProtectionOfficer?.email?.toLowerCase();
      if (dpoEmail !== existingDpoEmail) {
        await updateComplianceReportField(
          client,
          existing.id,
          'dataProtectionOfficer',
          dataProtectionOfficerId ? [dataProtectionOfficerId] : [],
          { logger },
        );
      }

      // Refresh row data from live processing activities
      await reprocessComplianceReport(client, existing.id, { logger });
      logger.info(`Successfully synced compliance report "${input.title}"!`);
    } catch (err) {
      encounteredError = true;
      logger.error(
        `Failed to sync compliance report "${input.title}"! - ${(err as Error).message}`,
      );
    }
  });

  return !encounteredError;
}
