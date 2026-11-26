import * as either from 'fp-ts/lib/Either.js';
import { describe, expect, it } from 'vitest';

import { ConsentManagerInput } from './consentManagerInput.js';

describe('ConsentManagerInput', () => {
  it('decodes reportOnly, experiences and regions', () => {
    const result = ConsentManagerInput.decode({
      reportOnly: true,
      domains: ['example.com'],
      experiences: [
        {
          name: 'EU',
          operator: 'IN',
          viewState: 'QuickOptions',
          onConsentExpiry: 'Prompt',
          regions: [{ country: 'DE' }],
        },
      ],
    });

    expect(either.isRight(result)).toBe(true);
    if (either.isRight(result)) {
      expect(result.right.reportOnly).toBe(true);
    }
  });

  it('rejects a non-boolean reportOnly', () => {
    expect(either.isLeft(ConsentManagerInput.decode({ reportOnly: 'yes' }))).toBe(true);
  });

  it('rejects an unknown experience operator', () => {
    const result = ConsentManagerInput.decode({ experiences: [{ name: 'EU', operator: 'MAYBE' }] });
    expect(either.isLeft(result)).toBe(true);
  });
});
