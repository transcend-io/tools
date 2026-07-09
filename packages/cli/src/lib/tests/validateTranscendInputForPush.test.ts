import { describe, expect, it } from 'vitest';

import {
  formatPushValidationErrors,
  validateTranscendInputForPush,
} from '../validateTranscendInputForPush.js';

describe('validateTranscendInputForPush', () => {
  it('rejects invalid attribute types before push', () => {
    const result = validateTranscendInputForPush({
      attributes: [{ name: 'dob', type: 'DATE', values: [] }],
    });

    expect(result.valid).toBe(false);
    expect(result.decodeErrors.length).toBeGreaterThan(0);
  });

  it('accepts a valid push config', () => {
    const result = validateTranscendInputForPush({
      purposes: [{ trackingType: 'Analytics', title: 'Analytics', name: 'Analytics' }],
    });

    expect(result.valid).toBe(true);
    expect(result.unsupportedKeys).toEqual([]);
  });

  it('rejects unsupported top-level keys with hints', () => {
    const result = validateTranscendInputForPush({
      'preference-topics': [{ slug: 'email' }],
    });

    expect(result.valid).toBe(false);
    expect(result.unsupportedKeys).toContain('preference-topics');
    expect(formatPushValidationErrors(result)).toContain('preference-options');
  });

  it('flags pull-only keys as noop without failing by default', () => {
    const result = validateTranscendInputForPush({
      assessments: [{ title: 'Assessment', group: 'Privacy' }],
    });

    expect(result.decodeErrors).toHaveLength(0);
    expect(result.noopKeys).toContain('assessments');
    expect(result.valid).toBe(true);
  });

  it('fails on noop keys when failOnNoopKeys is true', () => {
    const result = validateTranscendInputForPush(
      { assessments: [{ title: 'Assessment', group: 'Privacy' }] },
      { failOnNoopKeys: true },
    );

    expect(result.valid).toBe(false);
  });

  it('migrates singular compliance-report to plural compliance-reports', () => {
    const result = validateTranscendInputForPush({
      'compliance-report': [
        {
          title: 'Article 30 CCTV RoPA',
          'processing-activities-filter': { text: 'CCTV' },
          columns: [],
        },
      ],
    });

    expect(result.valid).toBe(true);
    expect(result.normalizedConfig?.['compliance-reports']).toHaveLength(1);
    expect(result.normalizedConfig?.['compliance-report']).toBeUndefined();
    expect(result.warnings.some((warning) => warning.includes('compliance-reports'))).toBe(true);
  });

  it('warns and strips locale on compliance-reports (not on CreateComplianceReportInput)', () => {
    const result = validateTranscendInputForPush({
      'compliance-reports': [
        {
          title: 'Italian Export',
          locale: 'it',
          columns: ['title'],
        },
      ],
    });

    expect(result.valid).toBe(true);
    expect(
      (result.normalizedConfig?.['compliance-reports'] as Record<string, unknown>[])[0].locale,
    ).toBeUndefined();
    expect(result.warnings.some((warning) => warning.includes('locale'))).toBe(true);
  });
});
