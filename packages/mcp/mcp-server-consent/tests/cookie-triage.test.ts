import { ConsentTrackerSource } from '@transcend-io/privacy-types';
import type { TranscendCookieGql } from '@transcend-io/sdk';
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
import {
  collectServiceOptions,
  isNewerThanWatermark,
  selectCookieNode,
  selectCurrentCard,
  sessionAfterShowingCookie,
  sessionAfterSkipCookie,
  type CookiePageResult,
} from '../src/cookieTriage/queue.js';

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

function cookieNode(
  overrides: Partial<TranscendCookieGql> & Pick<TranscendCookieGql, 'id' | 'name' | 'createdAt'>,
): TranscendCookieGql {
  return {
    isRegex: false,
    trackingPurposes: [],
    purposes: [],
    frequency: 0,
    isJunk: false,
    source: ConsentTrackerSource.Manual,
    status: 'NEEDS_REVIEW' as TranscendCookieGql['status'],
    owners: [],
    teams: [],
    attributeValues: [],
    updatedAt: overrides.createdAt,
    domains: [],
    occurrences: 0,
    consentSiteCountAllTime: 0,
    consentSiteCountLastWeek: 0,
    ...overrides,
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

describe('cookie triage watermark and selection', () => {
  it('compares createdAt then id for newer-than-watermark', () => {
    expect(isNewerThanWatermark('2024-02-01', 'b', '2024-01-01', 'a')).toBe(true);
    expect(isNewerThanWatermark('2024-01-01', 'a', '2024-02-01', 'b')).toBe(false);
    expect(isNewerThanWatermark('2024-01-01', 'z', '2024-01-01', 'a')).toBe(true);
    expect(isNewerThanWatermark('2024-01-01', 'a', '2024-01-01', 'z')).toBe(false);
  });

  it('prefers peek when newer than watermark', () => {
    const peekNode = cookieNode({
      id: 'uuid-z',
      name: 'new_cookie',
      createdAt: '2024-06-01T00:00:00.000Z',
    });
    const forwardNode = cookieNode({
      id: 'uuid-b',
      name: 'older_cookie',
      createdAt: '2024-01-02T00:00:00.000Z',
    });
    const peek: CookiePageResult = {
      node: peekNode,
      totalCount: 5,
      endCursor: 'cursor-z',
    };
    const forward: CookiePageResult = {
      node: forwardNode,
      totalCount: 5,
      endCursor: 'cursor-b',
    };

    const selected = selectCookieNode(peek, forward, {
      headCreatedAt: '2024-01-01T00:00:00.000Z',
      headId: 'uuid-a',
      after: 'cursor-a',
    });

    expect(selected.fromPeek).toBe(true);
    expect(selected.node?.name).toBe('new_cookie');
    expect(selected.endCursor).toBe('cursor-z');
  });

  it('uses forward when peek is not newer than watermark', () => {
    const head = cookieNode({
      id: 'uuid-a',
      name: 'head_cookie',
      createdAt: '2024-01-01T00:00:00.000Z',
    });
    const forwardNode = cookieNode({
      id: 'uuid-b',
      name: 'next_cookie',
      createdAt: '2023-12-01T00:00:00.000Z',
    });
    const selected = selectCookieNode(
      { node: head, totalCount: 2, endCursor: 'cursor-a' },
      { node: forwardNode, totalCount: 2, endCursor: 'cursor-b' },
      { headCreatedAt: head.createdAt, headId: head.id, after: 'cursor-a' },
    );

    expect(selected.fromPeek).toBe(false);
    expect(selected.node?.name).toBe('next_cookie');
  });

  it('on first card sets watermark and advances after for forward fetches', () => {
    const node = cookieNode({
      id: 'uuid-a',
      name: 'first',
      createdAt: '2024-01-01T00:00:00.000Z',
    });
    const next = sessionAfterShowingCookie({}, node, false, 'cursor-a');
    expect(next).toMatchObject({
      after: 'cursor-a',
      headCreatedAt: node.createdAt,
      headId: node.id,
      sessionIndex: 1,
      fromPeek: false,
      cardEndCursor: 'cursor-a',
      cardCookieId: node.id,
      cardCreatedAt: node.createdAt,
    });
  });

  it('peek show leaves after unchanged', () => {
    const node = cookieNode({
      id: 'uuid-z',
      name: 'peeked',
      createdAt: '2024-06-01T00:00:00.000Z',
    });
    const next = sessionAfterShowingCookie(
      {
        after: 'cursor-a',
        headCreatedAt: '2024-01-01T00:00:00.000Z',
        headId: 'uuid-a',
        sessionIndex: 2,
      },
      node,
      true,
      'cursor-z',
    );
    expect(next.after).toBe('cursor-a');
    expect(next.fromPeek).toBe(true);
    expect(next.headCreatedAt).toBe('2024-01-01T00:00:00.000Z');
    expect(next.sessionIndex).toBe(3);
  });

  it('skip raises watermark and advances after only for forward cards', () => {
    const forwardSkip = sessionAfterSkipCookie({
      after: 'cursor-prev',
      headCreatedAt: '2024-01-01T00:00:00.000Z',
      headId: 'uuid-a',
      sessionIndex: 1,
      fromPeek: false,
      cardEndCursor: 'cursor-b',
      cardCookieId: 'uuid-b',
      cardCreatedAt: '2024-01-02T00:00:00.000Z',
    });
    expect(forwardSkip.after).toBe('cursor-b');
    expect(forwardSkip.headCreatedAt).toBe('2024-01-02T00:00:00.000Z');
    expect(forwardSkip.headId).toBe('uuid-b');

    const peekSkip = sessionAfterSkipCookie({
      after: 'cursor-a',
      headCreatedAt: '2024-01-01T00:00:00.000Z',
      headId: 'uuid-a',
      sessionIndex: 2,
      fromPeek: true,
      cardEndCursor: 'cursor-z',
      cardCookieId: 'uuid-z',
      cardCreatedAt: '2024-06-01T00:00:00.000Z',
    });
    expect(peekSkip.after).toBe('cursor-a');
    expect(peekSkip.headCreatedAt).toBe('2024-06-01T00:00:00.000Z');
    expect(peekSkip.headId).toBe('uuid-z');
  });
});

describe('cookie triage data-flow fallback selection', () => {
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
  const secondFlow = enrichItem(
    rawNode({
      id: 'df-2',
      identifier: 'cdn.example.com',
      purposeName: 'Analytics',
      purposeSlug: 'Analytics',
      purposeId: 'p1',
      serviceTitle: 'Example',
      serviceKey: 'example',
    }),
  );

  const queue: TriageQueue = {
    slices: [
      { reviewType: 'cookie', items: attachBulkGroups([mixpanel]) },
      { reviewType: 'data_flow', items: attachBulkGroups([hotjarFlow, secondFlow]) },
    ],
    options: {
      purposes: [{ label: 'Analytics', value: 'Analytics', id: 'p1' }],
      services: collectServiceOptions([mixpanel, hotjarFlow, secondFlow]),
    },
  };

  const dfOnlyQueue: TriageQueue = {
    slices: [{ reviewType: 'data_flow', items: attachBulkGroups([hotjarFlow, secondFlow]) }],
    options: {
      purposes: [{ label: 'Analytics', value: 'Analytics', id: 'p1' }],
      services: collectServiceOptions([hotjarFlow, secondFlow]),
    },
  };

  it('prefers cookies before data flows', () => {
    const card = selectCurrentCard(queue);
    expect(card.reviewType).toBe('cookie');
    expect(card.item?.id).toBe('cookie-a');
    expect(card.index).toBe(1);
    expect(card.total).toBe(1);
  });

  it('advances data-flow page via skip count without skippedIds', () => {
    const first = selectCurrentCard(dfOnlyQueue, 0);
    expect(first.item?.id).toBe('df-1');

    const second = selectCurrentCard(dfOnlyQueue, 1, { sessionIndex: 1 });
    expect(second.item?.id).toBe('df-2');
    expect(second.index).toBe(2);
    expect(second.total).toBe(2);
  });

  it('returns empty when data-flow skip count exhausts the page', () => {
    const card = selectCurrentCard(dfOnlyQueue, 2);
    expect(card.item).toBeUndefined();
    expect(card.total).toBe(0);
  });

  it('collects unique sorted service titles', () => {
    expect(collectServiceOptions([mixpanel, hotjarFlow, mixpanel])).toEqual(['Hotjar', 'Mixpanel']);
  });
});
