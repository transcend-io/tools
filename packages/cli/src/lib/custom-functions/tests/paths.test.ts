import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  buildCustomFunctionProjectArguments,
  resolveCustomFunctionProjectPaths,
} from '../paths.js';

describe('resolveCustomFunctionProjectPaths', () => {
  it('uses the manifest directory when only --manifest is provided', () => {
    const paths = resolveCustomFunctionProjectPaths('/repo', {
      manifest: 'nested/functions.yml',
    });

    expect(paths).toEqual({
      targetDirectory: join('/repo', 'nested'),
      manifestDirectory: join('/repo', 'nested'),
      manifestPath: join('/repo', 'nested', 'functions.yml'),
    });
  });

  it('ignores the CLI framework positional default when --manifest is provided', () => {
    const paths = resolveCustomFunctionProjectPaths('/repo', {
      directory: 'transcend/custom-functions',
      manifest: 'nested/functions.yml',
    });

    expect(paths.targetDirectory).toBe(join('/repo', 'nested'));
  });

  it('rejects a manifest outside an explicitly selected project directory', () => {
    expect(() =>
      resolveCustomFunctionProjectPaths('/repo', {
        directory: 'project',
        manifest: 'other/functions.yml',
      }),
    ).toThrow('The manifest must be inside the Custom Function project directory.');
  });
});

describe('buildCustomFunctionProjectArguments', () => {
  it('omits the default manifest and shell-quotes apostrophes', () => {
    expect(
      buildCustomFunctionProjectArguments(
        "/repo/customer's functions",
        "/repo/customer's functions/transcend-functions.yml",
      ),
    ).toBe("'/repo/customer'\\''s functions'");
  });

  it('preserves a custom manifest in generated commands', () => {
    expect(
      buildCustomFunctionProjectArguments('/repo/functions', '/repo/functions/custom.yml'),
    ).toBe("'/repo/functions' --manifest='/repo/functions/custom.yml'");
  });
});
