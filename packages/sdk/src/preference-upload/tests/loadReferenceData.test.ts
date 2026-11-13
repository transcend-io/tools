import type { GraphQLClient } from 'graphql-request';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { Identifier } from '../../data-inventory/fetchAllIdentifiers.js';
import type { PreferenceTopic } from '../../preference-management/fetchAllPreferenceTopics.js';
import type { Purpose } from '../../preference-management/fetchAllPurposes.js';

const H = vi.hoisted(() => ({
  fetchAllPurposes: vi.fn(),
  fetchAllPreferenceTopics: vi.fn(),
  fetchAllIdentifiers: vi.fn(),
}));

vi.mock('../../preference-management/fetchAllPurposes.js', () => ({
  fetchAllPurposes: H.fetchAllPurposes,
}));
vi.mock('../../preference-management/fetchAllPreferenceTopics.js', () => ({
  fetchAllPreferenceTopics: H.fetchAllPreferenceTopics,
}));
vi.mock('../../data-inventory/fetchAllIdentifiers.js', () => ({
  fetchAllIdentifiers: H.fetchAllIdentifiers,
}));

import { loadReferenceData } from '../loadReferenceData.js';

const logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

describe('loadReferenceData', () => {
  let client: GraphQLClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = {
      request: vi.fn().mockResolvedValue({}),
    } as unknown as GraphQLClient;
  });

  it('loads purposes, topics, and identifiers', async () => {
    const purposes = [{ id: 'p1' }, { id: 'p2' }] as Purpose[];
    const preferenceTopics = [{ id: 't1' }] as PreferenceTopic[];
    const identifiers = [{ id: 'i1' }, { id: 'i2' }] as Identifier[];

    H.fetchAllPurposes.mockResolvedValueOnce(purposes);
    H.fetchAllPreferenceTopics.mockResolvedValueOnce(preferenceTopics);
    H.fetchAllIdentifiers.mockResolvedValueOnce(identifiers);

    const result = await loadReferenceData(client, { logger });

    expect(result).toEqual({ purposes, preferenceTopics, identifiers });
    expect(H.fetchAllPurposes).toHaveBeenCalledWith(client, { logger });
    expect(H.fetchAllPreferenceTopics).toHaveBeenCalledWith(client, { logger });
    expect(H.fetchAllIdentifiers).toHaveBeenCalledWith(client, { logger });
  });

  it('propagates errors (e.g., identifiers fetch fails)', async () => {
    const err = new Error('boom');

    H.fetchAllPurposes.mockResolvedValueOnce([{ id: 'p' }] as Purpose[]);
    H.fetchAllPreferenceTopics.mockResolvedValueOnce([{ id: 't' }] as PreferenceTopic[]);
    H.fetchAllIdentifiers.mockRejectedValueOnce(err);

    await expect(loadReferenceData(client, { logger })).rejects.toBe(err);
  });
});
