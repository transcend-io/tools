import { describe, expect, it } from 'vitest';

import {
  buildTriggerConditionFromPurposes,
  parsePurposesFromTriggerCondition,
} from '../syncConsentWorkflowTriggers.js';

describe('buildTriggerConditionFromPurposes', () => {
  it('builds And expression matching admin dashboard shape', () => {
    expect(
      buildTriggerConditionFromPurposes([
        { 'tracking-type': 'Marketing', 'matching-state': false },
        { 'tracking-type': 'Analytics', 'matching-state': true },
      ]),
    ).toBe(JSON.stringify({ And: [{ Marketing: false }, { Analytics: true }] }));
  });
});

describe('parsePurposesFromTriggerCondition', () => {
  it('parses And entries into purposes', () => {
    expect(
      parsePurposesFromTriggerCondition(
        JSON.stringify({ And: [{ Marketing: false }, { Analytics: true }] }),
      ),
    ).toEqual([
      { 'tracking-type': 'Marketing', 'matching-state': false },
      { 'tracking-type': 'Analytics', 'matching-state': true },
    ]);
  });

  it('round-trips with buildTriggerConditionFromPurposes', () => {
    const purposes = [{ 'tracking-type': 'SaleOfInfo', 'matching-state': false }] as const;
    const json = buildTriggerConditionFromPurposes([...purposes]);
    expect(parsePurposesFromTriggerCondition(json)).toEqual([...purposes]);
  });

  it('returns empty for null, invalid JSON, or unexpected shapes', () => {
    expect(parsePurposesFromTriggerCondition(null)).toEqual([]);
    expect(parsePurposesFromTriggerCondition(undefined)).toEqual([]);
    expect(parsePurposesFromTriggerCondition('not-json')).toEqual([]);
    expect(parsePurposesFromTriggerCondition(JSON.stringify({ Or: [{ X: true }] }))).toEqual([]);
    expect(parsePurposesFromTriggerCondition(JSON.stringify({ And: 'nope' }))).toEqual([]);
    expect(parsePurposesFromTriggerCondition(JSON.stringify({ And: null }))).toEqual([]);
    expect(parsePurposesFromTriggerCondition(JSON.stringify({ And: [null, 'x', []] }))).toEqual([]);
  });

  it('skips non-boolean matching states', () => {
    expect(
      parsePurposesFromTriggerCondition(
        JSON.stringify({ And: [{ Marketing: 'false' }, { Analytics: true }] }),
      ),
    ).toEqual([{ 'tracking-type': 'Analytics', 'matching-state': true }]);
  });
});
