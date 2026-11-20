import { ConsentTrackerStatus } from '@transcend-io/privacy-types';
import { describe, expect, it } from 'vitest';

import type { TranscendInput } from '../codecs.js';
import { planPush, renderPushPlanDiff } from '../preview/index.js';

const internalAppsLocal = {
  'consent-manager': {
    unknownRequestPolicy: 'BLOCK',
    unknownCookiePolicy: 'BLOCK',
    telemetryPartitioning: 'path',
    domains: ['localhost:5173', 'localhost:5174', 'app.retoolcloud.transcend.io'],
  },
  purposes: [
    {
      title: 'Analytics',
      name: 'Analytics',
      trackingType: 'Analytics',
      description: 'Measures how internal tools are used.',
      'default-consent': 'off',
    },
    {
      title: 'Essential',
      name: 'Essential',
      trackingType: 'Essential',
      description: 'Needed for internal tools to load and work.',
    },
    {
      title: 'Functional',
      name: 'Functional',
      trackingType: 'Functional',
      description: 'Remembers settings and preferences in internal tools.',
      'default-consent': 'off',
    },
  ],
  'data-flows': [
    {
      value: 'transcend.io',
      type: 'HOST',
      description: 'Transcend first-party apps and APIs.',
      trackingPurposes: ['Essential'],
      status: ConsentTrackerStatus.Live,
    },
  ],
} satisfies TranscendInput;

const internalAppsRemote = {
  'consent-manager': {
    unknownRequestPolicy: 'ALLOW',
    unknownCookiePolicy: 'ALLOW',
    telemetryPartitioning: 'origin',
    domains: ['internal-apps.transcend.io', 'cdn.transcend.io', 'transcend-cdn.com', 'localhost'],
  },
  purposes: [
    {
      title: 'Analytics',
      name: 'Analytics',
      trackingType: 'Analytics',
      description: 'Help us learn how our site is used and how it performs.',
      'default-consent': 'Auto',
    },
    {
      title: 'Essential',
      name: 'Essential',
      trackingType: 'Essential',
      description: 'No Consent Needed',
    },
    {
      title: 'Functional',
      name: 'Functional',
      trackingType: 'Functional',
      description: 'Personalization, autofilled forms, etc.',
      'default-consent': 'Auto',
    },
  ],
  'data-flows': [],
} satisfies TranscendInput;

describe('renderPushPlanDiff', () => {
  it('renders consent-manager, purpose, and data-flow changes for internal-apps', () => {
    const plan = planPush(internalAppsLocal, internalAppsRemote);
    const { markdown } = renderPushPlanDiff(plan);

    expect(markdown.startsWith('```diff')).toBe(true);
    expect(markdown).toContain('unknownRequestPolicy: ALLOW');
    expect(markdown).toContain('unknownRequestPolicy: BLOCK');
    expect(markdown).toContain('internal-apps.transcend.io');
    expect(markdown).toContain('localhost:5173');
    expect(markdown).toContain('transcend.io');
    expect(
      plan.effects.some((effect) => effect.description.includes('replaces the whole domain list')),
    ).toBe(true);
  });
});

describe('planPush consent-manager domains', () => {
  it('warns when live domains would be dropped', () => {
    const plan = planPush(
      { 'consent-manager': { domains: ['localhost:5173'] } },
      { 'consent-manager': { domains: ['internal-apps.transcend.io', 'cdn.transcend.io'] } },
    );
    expect(plan.effects).toEqual([
      expect.objectContaining({
        resource: 'consent-manager',
        description: expect.stringContaining('replaces the whole domain list'),
      }),
    ]);
  });
});
