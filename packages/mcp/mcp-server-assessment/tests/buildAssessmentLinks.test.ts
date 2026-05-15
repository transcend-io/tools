import { describe, it, expect } from 'vitest';

import {
  buildAssessmentLinks,
  buildAssessmentGroupUrl,
} from '../src/helpers/buildAssessmentLinks.js';

describe('buildAssessmentLinks', () => {
  const dashboardUrl = 'https://app.transcend.io';
  const assessmentFormId = '1928a56a-26b9-40f1-aac3-1b5208cd256e';

  it('always returns the form response URL', () => {
    const links = buildAssessmentLinks({ dashboardUrl, assessmentFormId });

    expect(links.url).toBe(`${dashboardUrl}/assessments/forms/${assessmentFormId}/response`);
  });

  it('never emits the assignee-only /view URL', () => {
    const links = buildAssessmentLinks({ dashboardUrl, assessmentFormId });

    expect(links.url).not.toContain('/view');
  });

  it('only exposes a `url` field (no sibling fields that could confuse agents)', () => {
    const links = buildAssessmentLinks({ dashboardUrl, assessmentFormId });

    expect(Object.keys(links).sort()).toEqual(['url']);
  });

  it('handles dashboard URLs that include a trailing slash', () => {
    const links = buildAssessmentLinks({
      dashboardUrl: 'https://app.transcend.io/',
      assessmentFormId,
    });

    expect(links.url).toBe(
      `https://app.transcend.io/assessments/forms/${assessmentFormId}/response`,
    );
  });

  it('honors a caller-supplied dashboard URL (e.g. staging)', () => {
    const links = buildAssessmentLinks({
      dashboardUrl: 'https://app.staging.transcend.io',
      assessmentFormId,
    });

    expect(links.url).toBe(
      `https://app.staging.transcend.io/assessments/forms/${assessmentFormId}/response`,
    );
  });
});

describe('buildAssessmentGroupUrl', () => {
  it('builds the canonical group URL', () => {
    expect(buildAssessmentGroupUrl('https://app.transcend.io', 'grp-1')).toBe(
      'https://app.transcend.io/assessments/groups/grp-1',
    );
  });

  it('trims a trailing slash from the dashboard URL', () => {
    expect(buildAssessmentGroupUrl('https://app.transcend.io/', 'grp-2')).toBe(
      'https://app.transcend.io/assessments/groups/grp-2',
    );
  });
});
