import { mapSeries, type Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest, NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import { COMPLIANCE_REPORT_DATA, COMPLIANCE_REPORTS } from './gqls/complianceReport.js';

export interface ComplianceReportProcessingActivitiesFilter {
  /** Free-text filter over processing activity title/description */
  text?: string;
  /** Processing activity IDs */
  ids?: string[];
  /** Attribute value IDs */
  attributeValueIds?: string[];
  /** Business entity IDs */
  businessEntityIds?: string[];
  /** Data silo IDs */
  dataSiloIds?: string[];
  /** Data subject IDs */
  dataSubjectIds?: string[];
  /** Team IDs */
  teamIds?: string[];
  /** Owner user IDs */
  ownerIds?: string[];
  /** Processing purposes */
  purposes?: string[];
  /** Processing purpose sub-category IDs */
  processingPurposeSubCategoryIds?: string[];
  /** Data category types */
  dataCategories?: string[];
  /** Data sub-category IDs */
  dataSubCategoryIds?: string[];
  /** SaaS category IDs */
  saaSCategoryIds?: string[];
  /** Vendor IDs */
  vendorIds?: string[];
  /** Controllership values */
  controllerships?: string[];
}

export interface ComplianceReport {
  /** ID of compliance report */
  id: string;
  /** Title of compliance report */
  title: string;
  /** Description of compliance report */
  description?: string | null;
  /** JSON filter applied when the report was created (parsed) */
  processingActivitiesFilter: ComplianceReportProcessingActivitiesFilter;
  /** Raw JSON string from GraphQL */
  processingActivitiesFilterRaw: string;
  /** Data protection officer */
  dataProtectionOfficer?: {
    /** User ID */
    id: string;
    /** User email */
    email: string;
  } | null;
  /**
   * Column sources used to build the report
   * (ProcessingActivitiesColumnName or attribute key UUID).
   * Empty when column data could not be loaded.
   */
  columns: string[];
}

const PAGE_SIZE = 20;

/**
 * Parse the processingActivitiesFilter JSON blob from GraphQL.
 *
 * @param raw - JSON string from the API
 * @returns Parsed filter object (empty object on failure)
 */
export function parseProcessingActivitiesFilter(
  raw: string | null | undefined,
): ComplianceReportProcessingActivitiesFilter {
  if (!raw) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    return parsed as ComplianceReportProcessingActivitiesFilter;
  } catch {
    return {};
  }
}

/**
 * Fetch column sources for a single compliance report.
 *
 * @param client - GraphQL client
 * @param complianceReportId - Report ID
 * @param options - Options
 * @returns Column source identifiers
 */
async function fetchComplianceReportColumns(
  client: GraphQLClient,
  complianceReportId: string,
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<string[]> {
  const { logger = NOOP_LOGGER } = options;
  try {
    const {
      complianceReportData: { data },
    } = await makeGraphQLRequest<{
      /** Report data payload */
      complianceReportData: {
        /** Structured report data */
        data: {
          /** Columns */
          columns: {
            /** Column ID */
            id: string;
            /** Display name */
            name: string;
            /** Source column / attribute key */
            source?: string | null;
          }[];
        };
      };
    }>(client, COMPLIANCE_REPORT_DATA, {
      variables: { id: complianceReportId },
      logger,
    });
    return data.columns
      .map((column) => column.source)
      .filter((source): source is string => Boolean(source));
  } catch (err) {
    logger.warn(
      `Failed to fetch columns for compliance report "${complianceReportId}": ${(err as Error).message}`,
    );
    return [];
  }
}

/**
 * Fetch all compliance reports in the organization
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns All compliance reports in the organization
 */
export async function fetchAllComplianceReports(
  client: GraphQLClient,
  options: {
    /** Logger instance */
    logger?: Logger;
    /** When false, skip per-report column fetches (faster list-only pull) */
    includeColumns?: boolean;
  } = {},
): Promise<ComplianceReport[]> {
  const { logger = NOOP_LOGGER, includeColumns = true } = options;
  const reports: Omit<ComplianceReport, 'columns'>[] = [];
  let offset = 0;

  let shouldContinue = false;
  do {
    const {
      complianceReports: { nodes },
    } = await makeGraphQLRequest<{
      /** Compliance reports */
      complianceReports: {
        /** List */
        nodes: {
          /** ID */
          id: string;
          /** Title */
          title: string;
          /** Description */
          description?: string | null;
          /** Filter JSON string */
          processingActivitiesFilter: string;
          /** DPO */
          dataProtectionOfficer?: {
            /** ID */
            id: string;
            /** Email */
            email: string;
          } | null;
        }[];
      };
    }>(client, COMPLIANCE_REPORTS, {
      variables: { first: PAGE_SIZE, offset },
      logger,
    });
    reports.push(
      ...nodes.map((node) => ({
        id: node.id,
        title: node.title,
        description: node.description,
        processingActivitiesFilterRaw: node.processingActivitiesFilter,
        processingActivitiesFilter: parseProcessingActivitiesFilter(
          node.processingActivitiesFilter,
        ),
        dataProtectionOfficer: node.dataProtectionOfficer,
      })),
    );
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  const withColumns = await mapSeries(reports, async (report) => {
    const columns = includeColumns
      ? await fetchComplianceReportColumns(client, report.id, { logger })
      : [];
    return { ...report, columns };
  });

  return withColumns.sort((a, b) => a.title.localeCompare(b.title));
}
