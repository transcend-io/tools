import { ConsentTrackerSource } from '@transcend-io/privacy-types';
import { describe, expect, it } from 'vitest';

import {
  attachBulkGroups,
  enrichItem,
  findBulkGroup,
  formatOccurrences,
  formatSource,
  suggestAction,
} from '../src/cookieTriage/enrich.js';
import type {
  CookieTriageClassification,
  CookieTriageItem,
  CookieTriageRawNode,
  TriageQueue,
} from '../src/cookieTriage/index.js';
import { collectServiceOptions, selectCurrentCard } from '../src/cookieTriage/queue.js';

function classification(
  overrides: Partial<CookieTriageClassification> = {},
): CookieTriageClassification {
  return {
    purpose: '',
    purposeSlug: '',
    purposeId: '',
    service: '',
    serviceKey: '',
    ...overrides,
  };
}

function rawNode(overrides: Partial<CookieTriageRawNode> = {}): CookieTriageRawNode {
  return {
    id: 'mp_mixpanel',
    identifier: 'mp_mixpanel',
    source: ConsentTrackerSource.Manual,
    occurrences: 0,
    ...overrides,
  };
}

function item(overrides: Partial<CookieTriageItem> = {}): CookieTriageItem {
  const base = enrichItem(
    rawNode({
      id: overrides.id ?? 'a',
      identifier: overrides.identifier ?? 'a',
      purposeName: 'Analytics',
      purposeSlug: 'Analytics',
      purposeId: 'p1',
      serviceTitle: 'Mixpanel',
      serviceKey: 'mixpanel',
    }),
  );
  return {
    ...base,
    ...overrides,
    classification: { ...base.classification, ...overrides.classification },
  };
}

describe('cookie triage enrich', () => {
  it('formats known sources in mockup voice', () => {
    expect(formatSource(ConsentTrackerSource.Manual)).toContain('Manual');
    expect(formatSource(ConsentTrackerSource.Scan)).toContain('Scan-discovered');
    expect(formatSource(ConsentTrackerSource.Telemetry)).toContain('Telemetry');
  });

  it('formats zero and nonzero occurrences', () => {
    expect(formatOccurrences(0).summary).toContain('0 occurrences');
    expect(formatOccurrences(1204).summary).toContain('1,204');
  });

  it('suggests high confidence when purpose and service are set', () => {
    const suggestion = suggestAction(
      classification({
        purpose: 'Analytics',
        purposeSlug: 'Analytics',
        service: 'Mixpanel',
        serviceKey: 'mixpanel',
      }),
    );
    expect(suggestion.confidence).toBe('high');
    expect(suggestion.action).toBe('approve');
    expect(suggestion.reasoning).toContain('Fully specified');
  });

  it('suggests medium confidence when only one of purpose/service is set', () => {
    expect(
      suggestAction(classification({ purpose: 'Analytics', purposeSlug: 'Analytics' })).confidence,
    ).toBe('medium');
    expect(
      suggestAction(classification({ service: 'Mixpanel', serviceKey: 'mixpanel' })).confidence,
    ).toBe('medium');
  });

  it('suggests low confidence when unclassified', () => {
    expect(suggestAction(classification()).confidence).toBe('low');
    expect(suggestAction(classification()).reasoning).toContain('Needs classification');
  });

  it('enriches a raw node with description fallback and suggestion', () => {
    const enriched = enrichItem(rawNode({ description: '  ' }));
    expect(enriched.description).toBe('No description on file');
    expect(enriched.source).toContain('Manual');
    expect(enriched.suggestion.confidence).toBe('low');
  });

  it('finds high-confidence siblings sharing a service', () => {
    const current = item({ id: 'c1' });
    const sibling = item({ id: 'c2', identifier: 'c2' });
    const otherService = item({
      id: 'c3',
      classification: classification({
        purpose: 'Analytics',
        purposeSlug: 'Analytics',
        purposeId: 'p1',
        service: 'Hotjar',
        serviceKey: 'hotjar',
      }),
    });
    // otherService needs high confidence via suggestAction path — rebuild via enrich
    const hotjar = enrichItem(
      rawNode({
        id: 'c3',
        identifier: 'c3',
        purposeName: 'Analytics',
        purposeSlug: 'Analytics',
        purposeId: 'p1',
        serviceTitle: 'Hotjar',
        serviceKey: 'hotjar',
      }),
    );

    const group = findBulkGroup(current, [current, sibling, otherService, hotjar]);
    expect(group).toEqual({
      siblingCount: 1,
      service: 'Mixpanel',
      siblingIds: ['c2'],
    });
  });

  it('attachBulkGroups only tags fully classified high-confidence items', () => {
    const classified = enrichItem(
      rawNode({
        id: 'c1',
        purposeName: 'Analytics',
        purposeSlug: 'Analytics',
        purposeId: 'p1',
        serviceTitle: 'Mixpanel',
        serviceKey: 'mixpanel',
      }),
    );
    const sibling = enrichItem(
      rawNode({
        id: 'c2',
        identifier: 'c2',
        purposeName: 'Analytics',
        purposeSlug: 'Analytics',
        purposeId: 'p1',
        serviceTitle: 'Mixpanel',
        serviceKey: 'mixpanel',
      }),
    );
    const unclassified = enrichItem(rawNode({ id: 'c3', identifier: 'c3' }));

    const attached = attachBulkGroups([classified, sibling, unclassified]);
    expect(attached[0]!.bulkGroup?.siblingCount).toBe(1);
    expect(attached[2]!.bulkGroup).toBeUndefined();
  });
});

describe('cookie triage queue selection', () => {
  const mixpanel = enrichItem(
    rawNode({
      id: 'cookie-a',
      identifier: 'cookie-a',
      purposeName: 'Analytics',
      purposeSlug: 'Analytics',
      purposeId: 'p1',
      serviceTitle: 'Mixpanel',
      serviceKey: 'mixpanel',
    }),
  );
  const hotjarFlow = enrichItem(
    rawNode({
      id: 'df-1',
      identifier: 'static.hotjar.com',
      purposeName: 'Analytics',
      purposeSlug: 'Analytics',
      purposeId: 'p1',
      serviceTitle: 'Hotjar',
      serviceKey: 'hotjar',
      source: ConsentTrackerSource.Scan,
      occurrences: 1204,
    }),
  );

  const queue: TriageQueue = {
    slices: [
      { reviewType: 'cookie', items: attachBulkGroups([mixpanel]) },
      { reviewType: 'data_flow', items: attachBulkGroups([hotjarFlow]) },
    ],
    options: {
      purposes: [{ label: 'Analytics', value: 'Analytics', id: 'p1' }],
      services: collectServiceOptions([mixpanel, hotjarFlow]),
    },
  };

  it('prefers cookies before data flows', () => {
    const card = selectCurrentCard(queue);
    expect(card.reviewType).toBe('cookie');
    expect(card.item?.id).toBe('cookie-a');
    expect(card.total).toBe(1);
  });

  it('skips to data flows when cookies are skipped', () => {
    const card = selectCurrentCard(queue, ['cookie-a']);
    expect(card.reviewType).toBe('data_flow');
    expect(card.item?.id).toBe('df-1');
  });

  it('returns an empty-queue payload when everything is skipped', () => {
    const card = selectCurrentCard(queue, ['cookie-a', 'df-1']);
    expect(card.item).toBeUndefined();
    expect(card.total).toBe(0);
  });

  it('collects unique sorted service titles', () => {
    expect(collectServiceOptions([mixpanel, hotjarFlow, mixpanel])).toEqual(['Hotjar', 'Mixpanel']);
  });
});
