import { parse } from 'jsonc-parser';
import { describe, expect, it } from 'vitest';

import {
  mergeDenoConfiguration,
  mergeEditorExtensions,
  mergeEditorSettings,
  mergeJsonc,
} from '../scaffold-config.js';

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

    const merged = mergeDenoConfiguration(existing, '1.2.3');
    const rerun = mergeDenoConfiguration(merged, '1.2.3');

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
        'custom-functions:check': "transcend custom-functions check '.' --noInteractive",
      },
    });
    expect(rerun).toBe(merged);
  });

  it('migrates the generated task and preserves custom manifest paths', () => {
    const legacy = `{
  "tasks": {
    "custom-functions:check": "deno check functions/**/*.ts && deno lint functions/ && deno fmt --check functions/ test-payloads/"
  }
}
`;

    expect(
      parse(
        mergeDenoConfiguration(legacy, '1.2.3', 'functions.yml', {
          sources: ['./src/custom.ts'],
          payloads: ['./fixtures/custom.json'],
        }),
      ),
    ).toMatchObject({
      tasks: {
        'custom-functions:check':
          "transcend custom-functions check '.' --manifest='functions.yml' --noInteractive",
      },
      lint: { include: expect.arrayContaining(['./src/custom.ts']) },
      fmt: {
        include: expect.arrayContaining([
          'functions.yml',
          './src/custom.ts',
          './fixtures/custom.json',
        ]),
      },
    });
  });

  it('refuses to replace a conflicting Custom Function task', () => {
    expect(() =>
      mergeDenoConfiguration(
        '{"tasks":{"custom-functions:check":"deno task something-else"}}\n',
        '1.2.3',
      ),
    ).toThrow(
      'Deno task "custom-functions:check" already has a different command; apply the patch manually.',
    );
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
    expect(() => mergeDenoConfiguration('{\n  "compilerOptions":,\n}\n', '1.2.3')).toThrow(
      'Cannot safely merge Deno configuration; fix its JSONC syntax or apply the patch manually.',
    );
  });

  it('merges editor support without disturbing unrelated settings', () => {
    const settings = mergeEditorSettings(
      `{
  // Keep the repository formatter.
  "editor.defaultFormatter": "example.formatter"
}
`,
      '/repo',
      '/repo/packages/functions',
    );
    const extensions = mergeEditorExtensions('{"recommendations":["example.extension"]}\n');

    expect(settings).toContain('// Keep the repository formatter.');
    expect(parse(settings)).toEqual({
      'editor.defaultFormatter': 'example.formatter',
      'deno.enable': true,
      'deno.enablePaths': ['packages/functions'],
    });
    expect(parse(extensions)).toEqual({
      recommendations: ['example.extension', 'denoland.vscode-deno'],
    });
  });
});
