import { describe, expect, it } from 'vitest';

import { projectCookieForTriage, projectListNodeForTriage } from '../src/lib/projectTriageItem.js';

describe('projectCookieForTriage', () => {
  it('projects service title and last activity', () => {
    expect(
      projectCookieForTriage({
        id: 'c1',
        name: '_ga',
        service: { title: 'Google Analytics' },
        trackingPurposes: ['Analytics'],
        occurrences: 10,
        lastDiscoveredAt: '2026-08-25T14:32:00.000Z',
      }),
    ).toEqual({
      name: '_ga',
      id: 'c1',
      service: 'Google Analytics',
      trackingPurposes: ['Analytics'],
      occurrences: 10,
      lastActivityAt: '2026-08-25T14:32:00.000Z',
    });
  });
});

describe('projectListNodeForTriage', () => {
  it('projects a cookie node and a data-flow node', () => {
    expect(
      projectListNodeForTriage('cookies', {
        id: 'c1',
        name: '_ga',
        trackingPurposes: ['Analytics'],
        occurrences: 3,
      }),
    ).toEqual({
      name: '_ga',
      id: 'c1',
      trackingPurposes: ['Analytics'],
      occurrences: 3,
    });

    expect(
      projectListNodeForTriage('data_flows', {
        id: 'df1',
        value: 'cdn.example.com',
        trackingType: ['Advertising'],
        occurrences: 42,
      }),
    ).toEqual({
      name: 'cdn.example.com',
      id: 'df1',
      trackingPurposes: ['Advertising'],
      occurrences: 42,
    });
  });

  it('returns undefined for unusable nodes', () => {
    expect(projectListNodeForTriage('cookies', { value: 'not-a-cookie' })).toBeUndefined();
    expect(projectListNodeForTriage('data_flows', { name: 'not-a-flow' })).toBeUndefined();
    expect(projectListNodeForTriage('cookies', null)).toBeUndefined();
  });
});
