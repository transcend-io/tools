import { describe, expect, it } from 'vitest';

import { validateTranscendInputForPush } from '../validateTranscendInputForPush.js';

describe('validateTranscendInputForPush', () => {
  it('rejects invalid attribute types before push', () => {
    const result = validateTranscendInputForPush({
      attributes: [{ name: 'dob', type: 'DATE', values: [] }],
    });

    expect(result.valid).toBe(false);
    expect(result.decodeErrors.length).toBeGreaterThan(0);
  });

  it('warns on noop keys like assessments', () => {
    const result = validateTranscendInputForPush({
      assessments: [],
    });

    expect(result.decodeErrors).toHaveLength(0);
  });
});
