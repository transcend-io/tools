import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import packageJson from '../package.json' with { type: 'json' };

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('@transcend-io/pulumi-transcend scaffold', () => {
  test('package metadata matches the workspace layout', () => {
    expect(packageJson.name).toBe('@transcend-io/pulumi-transcend');
    expect(packageJson.version).toBe('0.0.0');
    expect(packageJson.scripts?.build).toBe('tsdown');
  });

  test('pulumi plugin manifest declares the transcend provider', () => {
    const pluginYaml = readFileSync(
      join(packageRoot, 'pulumi-resource-transcend/PulumiPlugin.yaml'),
      'utf8',
    );
    expect(pluginYaml).toContain('name: transcend');
    expect(pluginYaml).toContain('name: nodejs');
  });

  test('public entry re-exports the TypeScript SDK', () => {
    const source = readFileSync(join(packageRoot, 'src/index.ts'), 'utf8');
    expect(source).toContain("export { Config, type ConfigArgs } from './sdk/config.js'");
    expect(source).toContain(
      "export { getConfig, type GetConfigArgs, type GetConfigResult } from './sdk/getConfig.js'",
    );
    expect(source).toContain("export { Provider, type ProviderArgs } from './sdk/provider.js'");
  });
});
