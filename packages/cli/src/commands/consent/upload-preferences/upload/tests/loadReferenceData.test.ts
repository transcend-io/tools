import type { PreferenceTopic, Purpose } from '@transcend-io/sdk';
import type { GraphQLClient } from 'graphql-request';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { Identifier } from '../../../../../lib/graphql/index.js';

// Shared mocks (we’ll reset them each test)
const mFetchAllPurposes = vi.fn();
const mFetchAllPreferenceTopics = vi.fn();
const mFetchAllIdentifiers = vi.fn();

// Helper: after resetting modules, install the mocks, then import SUT fresh
async function importSut(): Promise<{
  loadReferenceData: (typeof import('../loadReferenceData.js'))['loadReferenceData'];
}> {
  // Mock BEFORE importing the SUT
  vi.mock('@transcend-io/sdk', () => ({
    fetchAllPurposes: mFetchAllPurposes,
    fetchAllPreferenceTopics: mFetchAllPreferenceTopics,
  }));

  vi.mock('../../../../../lib/graphql/index.js', () => ({
    fetchAllIdentifiers: mFetchAllIdentifiers,
  }));

  const mod = await import('../loadReferenceData.js');
  return {
    loadReferenceData:
      mod.loadReferenceData as (typeof import('../loadReferenceData.js'))['loadReferenceData'],
  };
}

describe('loadReferenceData', () => {
  let client: GraphQLClient;

  beforeEach(() => {
    vi.resetModules(); // ensure a clean module graph so mocks stick

    // IMPORTANT: reset implementations + once-queues between tests
    mFetchAllPurposes.mockReset();
    mFetchAllPreferenceTopics.mockReset();
    mFetchAllIdentifiers.mockReset();

    // Minimal safe stub
    client = {
      request: vi.fn().mockResolvedValue({}),
    } as unknown as GraphQLClient;
  });

  it('loads purposes, topics, and identifiers', async () => {
    const { loadReferenceData } = await importSut();

    const purposes = [{ id: 'p1' }, { id: 'p2' }] as Purpose[];
    const preferenceTopics = [{ id: 't1' }] as PreferenceTopic[];
    const identifiers = [{ id: 'i1' }, { id: 'i2' }] as Identifier[];

    mFetchAllPurposes.mockResolvedValueOnce(purposes);
    mFetchAllPreferenceTopics.mockResolvedValueOnce(preferenceTopics);
    mFetchAllIdentifiers.mockResolvedValueOnce(identifiers);

    const result = await loadReferenceData(client);

    expect(result.client).toBe(client);
    expect(result.purposes).toEqual(purposes);
    expect(result.preferenceTopics).toEqual(preferenceTopics);
    expect(result.identifiers).toEqual(identifiers);

    expect(mFetchAllPurposes).toHaveBeenCalledTimes(1);
    expect(mFetchAllPurposes).toHaveBeenCalledWith(
      client,
      expect.objectContaining({ logger: expect.anything() }),
    );

    expect(mFetchAllPreferenceTopics).toHaveBeenCalledTimes(1);
    expect(mFetchAllPreferenceTopics).toHaveBeenCalledWith(
      client,
      expect.objectContaining({ logger: expect.anything() }),
    );

    expect(mFetchAllIdentifiers).toHaveBeenCalledTimes(1);
    expect(mFetchAllIdentifiers).toHaveBeenCalledWith(
      client,
      expect.objectContaining({ logger: expect.anything() }),
    );
  });

  it('propagates errors (e.g., identifiers fetch fails)', async () => {
    const { loadReferenceData } = await importSut();

    const err = new Error('boom');

    mFetchAllPurposes.mockResolvedValueOnce([{ id: 'p' }] as Purpose[]);
    mFetchAllPreferenceTopics.mockResolvedValueOnce([{ id: 't' }] as PreferenceTopic[]);
    mFetchAllIdentifiers.mockRejectedValueOnce(err);

    await expect(loadReferenceData(client)).rejects.toBe(err);

    expect(mFetchAllPurposes).toHaveBeenCalledTimes(1);
    expect(mFetchAllPreferenceTopics).toHaveBeenCalledTimes(1);
    expect(mFetchAllIdentifiers).toHaveBeenCalledTimes(1);
  });
});
