import { describe, expect, it } from 'vitest';

import {
  ARTICLE_30_DEFAULT_COMPLIANCE_REPORT_COLUMNS,
  resolveComplianceReportColumns,
} from '../complianceReportDefaults.js';
import { parseProcessingActivitiesFilter } from '../fetchAllComplianceReports.js';
import { toGraphQLProcessingActivitiesFilter } from '../syncComplianceReports.js';

describe('resolveComplianceReportColumns', () => {
  it('returns Article 30 defaults when columns are empty or omitted', () => {
    expect(resolveComplianceReportColumns(undefined)).toEqual([
      ...ARTICLE_30_DEFAULT_COMPLIANCE_REPORT_COLUMNS,
    ]);
    expect(resolveComplianceReportColumns([])).toEqual([
      ...ARTICLE_30_DEFAULT_COMPLIANCE_REPORT_COLUMNS,
    ]);
  });

  it('preserves explicit columns', () => {
    expect(resolveComplianceReportColumns(['title', 'owners'])).toEqual(['title', 'owners']);
  });
});

describe('parseProcessingActivitiesFilter', () => {
  it('parses valid JSON', () => {
    expect(parseProcessingActivitiesFilter('{"text":"CCTV"}')).toEqual({ text: 'CCTV' });
  });

  it('returns empty object for invalid input', () => {
    expect(parseProcessingActivitiesFilter(undefined)).toEqual({});
    expect(parseProcessingActivitiesFilter('not-json')).toEqual({});
    expect(parseProcessingActivitiesFilter('[]')).toEqual({});
  });
});

describe('toGraphQLProcessingActivitiesFilter', () => {
  it('strips empty values', () => {
    expect(
      toGraphQLProcessingActivitiesFilter({
        text: 'CCTV',
        ids: [],
        purposes: undefined,
      }),
    ).toEqual({ text: 'CCTV' });
  });
});
