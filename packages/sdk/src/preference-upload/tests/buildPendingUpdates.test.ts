import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import type { Purpose } from '../../preference-management/fetchAllPurposes.js';
import { NONE_PREFERENCE_MAP } from '../../preference-management/getPreferenceIdentifiersFromRow.js';
import { buildPendingUpdates, type BuildPendingParams } from '../buildPendingUpdates.js';

const NOW = new Date('2026-01-01T00:00:00.000Z');

const baseParams: BuildPendingParams = {
  safe: {},
  conflicts: {},
  skipConflictUpdates: false,
  timestampColumn: 'ts',
  columnToPurposeName: {
    marketing: {
      purpose: 'Marketing',
      preference: null,
      valueMapping: { true: true, false: false },
    },
  },
  columnToIdentifier: {
    email: { name: 'email', isUniqueOnPreferenceStore: true },
    uid: { name: 'userId', isUniqueOnPreferenceStore: true },
  },
  preferenceTopics: [],
  purposes: [{ trackingType: 'Marketing' } as Purpose],
  partition: 'partition-1',
  workflowAttrs: [{ key: 'Source', values: ['transcend-cli'] }],
  isSilent: true,
  skipWorkflowTriggers: false,
  forceTriggerWorkflows: false,
};

const rowA = {
  email: 'a@example.com',
  uid: 'u-a',
  marketing: 'true',
  ts: '2025-01-01T00:00:00.000Z',
  source: 'web',
};

const rowB = {
  email: 'b@example.com',
  uid: 'u-b',
  marketing: 'false',
  ts: '2025-02-01T00:00:00.000Z',
  source: '',
};

describe('buildPendingUpdates', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('builds an update with all identifiers, timestamp, and workflow settings', () => {
    const out = buildPendingUpdates({ ...baseParams, safe: { 'a@example.com': rowA } });

    expect(Object.keys(out)).toEqual(['a@example.com']);
    expect(out['a@example.com']).toEqual({
      identifiers: [
        { name: 'email', value: 'a@example.com' },
        { name: 'userId', value: 'u-a' },
      ],
      partition: 'partition-1',
      timestamp: '2025-01-01T00:00:00.000Z',
      purposes: [
        expect.objectContaining({
          purpose: 'Marketing',
          enabled: true,
          workflowSettings: {
            attributes: [{ key: 'Source', values: ['transcend-cli'] }],
            isSilent: true,
            skipWorkflowTrigger: false,
            forceTriggerWorkflow: false,
          },
        }),
      ],
    });
  });

  it('includes conflict rows unless skipConflictUpdates is set', () => {
    const conflicts: BuildPendingParams['conflicts'] = {
      'b@example.com': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        record: {} as any,
        row: rowB,
      },
    };

    const withConflicts = buildPendingUpdates({
      ...baseParams,
      safe: { 'a@example.com': rowA },
      conflicts,
    });
    expect(Object.keys(withConflicts).sort()).toEqual(['a@example.com', 'b@example.com']);
    expect(withConflicts['b@example.com']!.purposes).toEqual([
      expect.objectContaining({ purpose: 'Marketing', enabled: false }),
    ]);

    const safeOnly = buildPendingUpdates({
      ...baseParams,
      safe: { 'a@example.com': rowA },
      conflicts,
      skipConflictUpdates: true,
    });
    expect(Object.keys(safeOnly)).toEqual(['a@example.com']);
  });

  it('uses the current time when no timestamp column is mapped', () => {
    const none = buildPendingUpdates({
      ...baseParams,
      safe: { 'a@example.com': rowA },
      timestampColumn: NONE_PREFERENCE_MAP,
    });
    expect(none['a@example.com']!.timestamp).toBe(NOW.toISOString());

    const missing = buildPendingUpdates({
      ...baseParams,
      safe: { 'a@example.com': rowA },
      timestampColumn: undefined,
    });
    expect(missing['a@example.com']!.timestamp).toBe(NOW.toISOString());
  });

  it('adds metadata only when mapped columns have values', () => {
    const out = buildPendingUpdates({
      ...baseParams,
      safe: { 'a@example.com': rowA, 'b@example.com': rowB },
      columnToMetadata: { source: { key: 'signupSource' } },
    });

    expect(out['a@example.com']!.metadata).toEqual([{ key: 'signupSource', value: 'web' }]);
    expect(out['b@example.com']).not.toHaveProperty('metadata');
  });
});
