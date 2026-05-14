import { describe, it, expect } from 'vitest';

import {
  buildAssessmentLinks,
  buildAssessmentGroupUrl,
} from '../src/helpers/buildAssessmentLinks.js';

describe('buildAssessmentLinks', () => {
  const dashboardUrl = 'https://app.transcend.io';
  const assessmentFormId = '1928a56a-26b9-40f1-aac3-1b5208cd256e';
  const assessmentGroupId = '44dc90f1-71b8-4bb7-a2ae-053985605cf1';

  it.each(['DRAFT', 'CHANGES_REQUESTED', 'SHARED', 'IN_PROGRESS', 'APPROVED', 'REJECTED'] as const)(
    'uses the form response URL as the primary url for %s status',
    (status) => {
      const links = buildAssessmentLinks({
        dashboardUrl,
        assessmentFormId,
        assessmentGroupId,
        status,
      });

      expect(links.url).toBe(`${dashboardUrl}/assessments/forms/${assessmentFormId}/response`);
      expect(links.groupUrl).toBe(`${dashboardUrl}/assessments/groups/${assessmentGroupId}`);
    },
  );

  it('returns the group URL as the primary url for IN_REVIEW status', () => {
    const links = buildAssessmentLinks({
      dashboardUrl,
      assessmentFormId,
      assessmentGroupId,
      status: 'IN_REVIEW',
    });

    expect(links.url).toBe(`${dashboardUrl}/assessments/groups/${assessmentGroupId}`);
    expect(links.groupUrl).toBe(`${dashboardUrl}/assessments/groups/${assessmentGroupId}`);
  });

  it('falls back to the form response URL when group ID is unknown, even for IN_REVIEW', () => {
    const links = buildAssessmentLinks({
      dashboardUrl,
      assessmentFormId,
      status: 'IN_REVIEW',
    });

    expect(links.groupUrl).toBeUndefined();
    expect(links.url).toBe(`${dashboardUrl}/assessments/forms/${assessmentFormId}/response`);
  });

  it('never emits the assignee-only /view URL', () => {
    const links = buildAssessmentLinks({
      dashboardUrl,
      assessmentFormId,
      assessmentGroupId,
      status: 'DRAFT',
    });

    expect(links.url).not.toContain('/view');
    expect(links.groupUrl).not.toContain('/view');
  });

  it('handles dashboard URLs that include a trailing slash', () => {
    const links = buildAssessmentLinks({
      dashboardUrl: 'https://app.transcend.io/',
      assessmentFormId,
      assessmentGroupId,
      status: 'DRAFT',
    });

    expect(links.url).toBe(
      `https://app.transcend.io/assessments/forms/${assessmentFormId}/response`,
    );
    expect(links.groupUrl).toBe(`https://app.transcend.io/assessments/groups/${assessmentGroupId}`);
  });

  it('honors a caller-supplied dashboard URL (e.g. staging)', () => {
    const links = buildAssessmentLinks({
      dashboardUrl: 'https://app.staging.transcend.io',
      assessmentFormId,
      assessmentGroupId,
      status: 'IN_REVIEW',
    });

    expect(links.url).toBe(
      `https://app.staging.transcend.io/assessments/groups/${assessmentGroupId}`,
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
