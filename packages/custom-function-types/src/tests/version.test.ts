import { describe, expect, it } from 'vitest';

import packageJson from '../../package.json' with { type: 'json' };
import { CUSTOM_FUNCTION_TYPES_VERSION } from '../index.js';

describe('CUSTOM_FUNCTION_TYPES_VERSION', () => {
  it('matches the package version that will be published', () => {
    expect(CUSTOM_FUNCTION_TYPES_VERSION).toBe(packageJson.version);
  });
});
