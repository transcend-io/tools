import { describe, expect, test } from 'vitest';

import { UiSpecSchema, catalog } from '../src/catalog.js';

describe('UiSpecSchema', () => {
  test('accepts a consent-activity style dashboard spec', () => {
    const spec = {
      root: 'page',
      elements: {
        page: {
          type: 'Grid',
          props: { columns: 1 },
          children: ['heading', 'metrics'],
        },
        heading: {
          type: 'Heading',
          props: {
            text: 'Consent activity',
            variant: 'eyebrow',
            periods: ['7d', '30d', '90d', '6mo'],
            selectedPeriod: '90d',
          },
        },
        metrics: {
          type: 'Grid',
          props: { columns: 4 },
          children: ['optins', 'optouts', 'sessions', 'gaps'],
        },
        optins: {
          type: 'MetricCard',
          props: {
            label: 'Opt-ins',
            value: 1_020_000,
            format: 'compact',
            delta: { value: 9, direction: 'up', label: 'vs prior quarter' },
            deltaTone: 'positive',
          },
        },
        optouts: {
          type: 'MetricCard',
          props: {
            label: 'Opt-outs',
            value: 247_000,
            format: 'compact',
            delta: { value: 18, direction: 'up', label: 'vs prior quarter' },
            deltaTone: 'negative',
          },
        },
        sessions: {
          type: 'MetricCard',
          props: {
            label: 'Covered sessions',
            value: 38_600_000,
            format: 'compact',
            delta: { value: 4, direction: 'up', label: 'vs prior quarter' },
            deltaTone: 'neutral',
          },
        },
        gaps: {
          type: 'MetricCard',
          props: {
            label: 'Sync gaps',
            value: 1,
            format: 'number',
            note: { text: 'TikTok Ads not syncing', tone: 'negative' },
          },
        },
      },
    };

    const parsed = UiSpecSchema.safeParse(spec);
    expect(parsed.success).toBe(true);

    const forCatalog = {
      root: spec.root,
      elements: Object.fromEntries(
        Object.entries(spec.elements).map(([key, element]) => [
          key,
          { ...element, children: element.children ?? [], visible: null },
        ]),
      ),
    };
    expect(catalog.validate(forCatalog).success).toBe(true);
  });

  test('rejects an unknown component type', () => {
    const parsed = UiSpecSchema.safeParse({
      root: 'x',
      elements: {
        x: { type: 'LineChart', props: {} },
      },
    });
    expect(parsed.success).toBe(false);
  });
});
