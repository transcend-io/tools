import { describe, expect, it } from 'vitest';

import { InitialViewState, ViewState } from './index.js';

describe('@transcend-io/airgap.js-types', () => {
  it('exports consent UI view states', () => {
    expect(ViewState.Hidden).toBe('Hidden');
    expect(InitialViewState.Hidden).toBe('Hidden');
  });
});
