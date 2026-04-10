import { describe, it, expect } from 'vitest';

import { getPreferenceTools } from '../src/tools.js';

describe('Preferences Tools', () => {
  it('returns an empty array (REST-backed tools removed)', () => {
    const tools = getPreferenceTools({ graphql: {} as never });
    expect(tools).toHaveLength(0);
  });
});
