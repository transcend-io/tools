import { parse } from 'jsonc-parser';
import { describe, expect, it } from 'vitest';

import {
  applySetupFeatureOverrides,
  mergeDenoConfiguration,
  mergeJsonc,
  resolveSetupFeatures,
} from '../config.js';
import { CustomFunctionSetupFeature } from '../model.js';

describe('setup feature resolution', () => {
  it('applies explicit overrides in stable feature order', () => {
    const recommended = resolveSetupFeatures('recommended', {
      hasDetectedAgent: true,
    });

    expect(
      applySetupFeatureOverrides(recommended, {
        [CustomFunctionSetupFeature.Deno]: false,
        [CustomFunctionSetupFeature.Ci]: true,
      }),
    ).toEqual([
      CustomFunctionSetupFeature.Tasks,
      CustomFunctionSetupFeature.Skill,
      CustomFunctionSetupFeature.Ci,
    ]);
  });
});

describe('JSONC configuration merging', () => {
  it('preserves comments and is a no-op when rerun', () => {
    const existing = `{
  // Keep the project-specific compiler setting.
  "compilerOptions": {
    "noImplicitOverride": true
  },
  /* Keep this custom task. */
  "tasks": {
    "custom": "deno task custom"
  }
}
`;

    const merged = mergeDenoConfiguration(existing, '1.2.3', true);
    const rerun = mergeDenoConfiguration(merged, '1.2.3', true);

    expect(merged.match(/\/\/ Keep the project-specific compiler setting\./gu)).toHaveLength(1);
    expect(merged.match(/\/\* Keep this custom task\. \*\//gu)).toHaveLength(1);
    expect(parse(merged)).toMatchObject({
      imports: {
        '@transcend-io/custom-function-types': 'npm:@transcend-io/custom-function-types@1.2.3',
      },
      compilerOptions: {
        noImplicitOverride: true,
        strict: true,
      },
      tasks: {
        custom: 'deno task custom',
      },
    });
    expect(rerun).toBe(merged);
  });

  it('requires a manual patch when a trailing property comment cannot be preserved safely', () => {
    const existing = `{
  "strict": false // Explain why this is currently disabled.
}
`;

    expect(() =>
      mergeJsonc(existing, [{ path: ['additional'], value: true }], 'test configuration'),
    ).toThrow(
      'Cannot prove comment-preserving edits for test configuration; apply the displayed patch manually.',
    );
  });

  it('requires a manual patch for invalid JSONC instead of rewriting it', () => {
    expect(() => mergeDenoConfiguration('{\n  "compilerOptions":,\n}\n', '1.2.3', false)).toThrow(
      'Cannot safely merge Deno configuration; fix its JSONC syntax or apply the patch manually.',
    );
  });
});
