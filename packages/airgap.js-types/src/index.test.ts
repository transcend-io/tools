import { isLeft, isRight } from 'fp-ts/Either';
import { describe, expect, it } from 'vitest';

import { TrackingConsent } from './core.js';
import { InitialViewState, ViewState } from './index.js';

describe('@transcend-io/airgap.js-types', () => {
  it('exports consent UI view states', () => {
    expect(ViewState.Hidden).toBe('Hidden');
    expect(InitialViewState.Hidden).toBe('Hidden');
  });

  it('accepts TrackingConsent purpose values from DefaultConsentConfigValue', () => {
    const decoded = TrackingConsent.decode({
      Essential: true,
      Marketing: 'Auto',
      Analytics: false,
      Functional: 'on',
    });

    expect(isRight(decoded)).toBe(true);
  });

  it('rejects arbitrary string TrackingConsent purpose values', () => {
    const decoded = TrackingConsent.decode({
      Marketing: 'maybe',
    });

    expect(isLeft(decoded)).toBe(true);
  });
});
