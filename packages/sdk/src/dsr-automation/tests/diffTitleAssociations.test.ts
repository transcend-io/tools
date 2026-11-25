import { describe, expect, it } from 'vitest';

import { diffTitleAssociations } from '../diffTitleAssociations.js';

describe('diffTitleAssociations', () => {
  it('computes symmetric add and remove sets', () => {
    expect(diffTitleAssociations(['A', 'B'], ['B', 'C'])).toEqual({
      toAdd: ['C'],
      toRemove: ['A'],
    });
  });

  it('returns empty diff when lists match', () => {
    expect(diffTitleAssociations(['A'], ['A'])).toEqual({ toAdd: [], toRemove: [] });
  });
});
