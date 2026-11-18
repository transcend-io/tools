import type { GraphQLClient } from 'graphql-request';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const syncDataSubject = vi.fn();
const fetchAllDataSubjects = vi.fn();
const syncTeams = vi.fn();

vi.mock('../../dsr-automation/syncDataSubject.js', () => ({
  syncDataSubject: (...args: unknown[]) => syncDataSubject(...args),
}));

vi.mock('../../dsr-automation/fetchDataSubjects.js', () => ({
  fetchAllDataSubjects: (...args: unknown[]) => fetchAllDataSubjects(...args),
}));

vi.mock('../../administration/syncTeams.js', () => ({
  syncTeams: (...args: unknown[]) => syncTeams(...args),
}));

vi.mock('../ensureAllDataSubjectsExist.js', () => ({
  ensureAllDataSubjectsExist: async () => ({}),
}));

import { syncConfigurationToTranscend } from '../syncConfigurationToTranscend.js';

/** Unused GraphQL client: SDK helpers are mocked. */
const unusedClient = {} as GraphQLClient;

/** Logger that records messages so tests can assert on them */
function buildLogger() {
  return { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
}

describe('syncConfigurationToTranscend error reporting', () => {
  beforeEach(() => {
    syncDataSubject.mockReset();
    fetchAllDataSubjects.mockReset();
    syncTeams.mockReset();
  });

  it('records a per-item error when a data subject fails to sync', async () => {
    fetchAllDataSubjects.mockResolvedValue([{ id: 'subject-1', type: 'member' }]);
    syncDataSubject.mockRejectedValue(new Error('boom'));
    const logger = buildLogger();

    const result = await syncConfigurationToTranscend(
      { 'data-subjects': [{ type: 'member', title: 'Member', active: true }] },
      unusedClient,
      { logger },
    );

    expect(result.success).toBe(false);
    expect(result.errors).toEqual([{ resource: 'data-subjects', item: 'member', message: 'boom' }]);
    expect(logger.error).toHaveBeenCalled();
  });

  it('records an error when a data subject is missing from the organization', async () => {
    fetchAllDataSubjects.mockResolvedValue([]);

    const result = await syncConfigurationToTranscend(
      { 'data-subjects': [{ type: 'member', title: 'Member' }] },
      unusedClient,
      { logger: buildLogger() },
    );

    expect(result.success).toBe(false);
    expect(result.errors[0]).toMatchObject({ resource: 'data-subjects', item: 'member' });
    expect(syncDataSubject).not.toHaveBeenCalled();
  });

  it('records an error for helpers that only return a boolean', async () => {
    syncTeams.mockResolvedValue(false);

    const result = await syncConfigurationToTranscend({ teams: [] }, unusedClient, {
      logger: buildLogger(),
    });

    expect(result.success).toBe(false);
    expect(result.errors).toEqual([
      { resource: 'teams', item: undefined, message: 'Failed to sync teams' },
    ]);
  });
});
