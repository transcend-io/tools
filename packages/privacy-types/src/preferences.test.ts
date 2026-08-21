import * as either from 'fp-ts/lib/Either.js';
import { describe, expect, it } from 'vitest';

import {
  MAX_SOURCE_SYSTEM_LENGTH,
  PreferenceQueryResponseItem,
  PreferenceStorePurposeResponse,
  PreferenceStorePurposeUpdate,
  PreferenceUpdateItem,
} from './preferences.js';

const basePurpose = {
  purpose: 'Marketing',
  enabled: true,
};

const basePreferenceUpdateItem = {
  partition: 'default',
  timestamp: '2024-01-01T00:00:00.000Z',
  purposes: [basePurpose],
};

const basePreferenceQueryResponseItem = {
  partition: 'default',
  timestamp: '2024-01-01T00:00:00.000Z',
  system: {
    decryptionStatus: 'DECRYPTED',
  },
  consentManagement: {},
  purposes: [basePurpose],
};

describe('SourceSystemLabel / preference purpose codecs', () => {
  it('decodes a purpose with sourceSystem "Adobe"', () => {
    const result = PreferenceStorePurposeResponse.decode({
      ...basePurpose,
      sourceSystem: 'Adobe',
    });

    expect(either.isRight(result)).toBe(true);
    if (either.isRight(result)) {
      expect(result.right.sourceSystem).toBe('Adobe');
    }
  });

  it('rejects sourceSystem longer than MAX_SOURCE_SYSTEM_LENGTH', () => {
    const result = PreferenceStorePurposeUpdate.decode({
      ...basePurpose,
      sourceSystem: 'a'.repeat(MAX_SOURCE_SYSTEM_LENGTH + 1),
    });

    expect(either.isLeft(result)).toBe(true);
  });

  it('rejects empty sourceSystem', () => {
    const result = PreferenceStorePurposeResponse.decode({
      ...basePurpose,
      sourceSystem: '',
    });

    expect(either.isLeft(result)).toBe(true);
  });

  it('accepts sourceSystem of length 1 and 128', () => {
    const short = PreferenceStorePurposeResponse.decode({
      ...basePurpose,
      sourceSystem: 'A',
    });
    const max = PreferenceStorePurposeUpdate.decode({
      ...basePurpose,
      sourceSystem: 'b'.repeat(MAX_SOURCE_SYSTEM_LENGTH),
    });

    expect(either.isRight(short)).toBe(true);
    expect(either.isRight(max)).toBe(true);
  });

  it('decodes purpose timestamp on response and update', () => {
    const timestamp = '2024-06-15T12:00:00.000Z';
    const response = PreferenceStorePurposeResponse.decode({
      ...basePurpose,
      timestamp,
    });
    const update = PreferenceStorePurposeUpdate.decode({
      ...basePurpose,
      timestamp,
    });

    expect(either.isRight(response)).toBe(true);
    expect(either.isRight(update)).toBe(true);
    if (either.isRight(response)) {
      expect(response.right.timestamp).toBe(timestamp);
    }
  });

  it('round-trips PreferenceUpdateItem without sourceSystem', () => {
    const result = PreferenceUpdateItem.decode(basePreferenceUpdateItem);

    expect(either.isRight(result)).toBe(true);
    if (either.isRight(result)) {
      expect(result.right.purposes?.[0]?.sourceSystem).toBeUndefined();
    }
  });

  it('round-trips PreferenceQueryResponseItem without sourceSystem', () => {
    const result = PreferenceQueryResponseItem.decode(basePreferenceQueryResponseItem);

    expect(either.isRight(result)).toBe(true);
    if (either.isRight(result)) {
      expect(result.right.purposes[0]?.sourceSystem).toBeUndefined();
    }
  });

  it('omitted sourceSystem is ok', () => {
    const result = PreferenceStorePurposeUpdate.decode(basePurpose);

    expect(either.isRight(result)).toBe(true);
    if (either.isRight(result)) {
      expect(result.right.sourceSystem).toBeUndefined();
    }
  });
});
