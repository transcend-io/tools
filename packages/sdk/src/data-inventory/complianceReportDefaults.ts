/**
 * Sensible Article 30 / RoPA default columns when `columns` is empty in transcend.yml.
 *
 * Values are `ProcessingActivitiesColumnName` strings accepted by
 * `CreateComplianceReportInput.columns` (or attribute-key UUIDs).
 *
 * @see https://app.transcend.io/data-map/compliance-reports
 */
export const ARTICLE_30_DEFAULT_COMPLIANCE_REPORT_COLUMNS = [
  'title',
  'description',
  'dataSubjects',
  'processingPurposeSubCategories',
  'dataSubCategories',
  'controllerships',
  'retentionType',
  'storageRegions',
  'transferRegions',
  'securityMeasureDetails',
  'dataSilos',
  'owners',
  'teams',
] as const;

/**
 * Resolve columns for create/sync. Empty or omitted → Article 30 defaults.
 *
 * @param columns - Columns from YAML (ProcessingActivitiesColumnName or attribute key UUID)
 * @returns Non-empty column list for CreateComplianceReportInput
 */
export function resolveComplianceReportColumns(columns: string[] | undefined): string[] {
  if (columns && columns.length > 0) {
    return columns;
  }
  return [...ARTICLE_30_DEFAULT_COMPLIANCE_REPORT_COLUMNS];
}
