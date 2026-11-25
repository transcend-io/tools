import { describe, expect, it } from 'vitest';

import { CookieTriagePurposeCategory } from '../src/lib/cookieTriageConfig.js';
import { ConsentTriageType } from '../src/lib/cookieTriageTypes.js';
import { projectCookieForTriage, projectListNodeForTriage } from '../src/lib/projectTriageItem.js';

describe('projectCookieForTriage', () => {
  it('projects service title and last activity', () => {
    expect(
      projectCookieForTriage({
        id: 'c1',
        name: '_ga',
        service: { title: 'Google Analytics' },
        description: 'Analytics session cookie',
        trackingPurposes: [CookieTriagePurposeCategory.Analytics],
        occurrences: 10,
        lastDiscoveredAt: '2026-08-25T14:32:00.000Z',
      }),
    ).toEqual({
      name: '_ga',
      id: 'c1',
      service: 'Google Analytics',
      description: 'Analytics session cookie',
      trackingPurposes: [CookieTriagePurposeCategory.Analytics],
      occurrences: 10,
      lastActivityAt: '2026-08-25T14:32:00.000Z',
    });
  });
});

describe('projectListNodeForTriage', () => {
  it('projects a cookie node and a data-flow node', () => {
    expect(
      projectListNodeForTriage(ConsentTriageType.Cookies, {
        id: 'c1',
        name: '_ga',
        trackingPurposes: [CookieTriagePurposeCategory.Analytics],
        occurrences: 3,
      }),
    ).toEqual({
      name: '_ga',
      id: 'c1',
      trackingPurposes: [CookieTriagePurposeCategory.Analytics],
      occurrences: 3,
    });

    expect(
      projectListNodeForTriage(ConsentTriageType.DataFlows, {
        id: 'df1',
        value: 'cdn.example.com',
        trackingType: [CookieTriagePurposeCategory.Advertising],
        occurrences: 42,
      }),
    ).toEqual({
      name: 'cdn.example.com',
      id: 'df1',
      trackingPurposes: [CookieTriagePurposeCategory.Advertising],
      occurrences: 42,
    });
  });

  it('returns undefined for unusable nodes', () => {
    expect(
      projectListNodeForTriage(ConsentTriageType.Cookies, { value: 'not-a-cookie' }),
    ).toBeUndefined();
    expect(
      projectListNodeForTriage(ConsentTriageType.DataFlows, { name: 'not-a-flow' }),
    ).toBeUndefined();
    expect(projectListNodeForTriage(ConsentTriageType.Cookies, { name: '_ga' })).toBeUndefined();
    expect(projectListNodeForTriage(ConsentTriageType.Cookies, null)).toBeUndefined();
  });
});
