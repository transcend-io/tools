import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { CUSTOM_FUNCTION_TYPES_VERSION } from '@transcend-io/custom-function-types';
import { afterAll, describe, expect, it } from 'vitest';

import { insertCustomFunctionManifestEntry } from '../../../../lib/custom-functions/manifest.js';
import { mergeDenoConfiguration } from '../../../../lib/custom-functions/scaffold-config.js';
import {
  EMPTY_CUSTOM_FUNCTION_MANIFEST,
  prepareGeneratedCustomFunction,
} from '../../../../lib/custom-functions/scaffold-planning.js';
import { buildContextForTest } from '../../../../lib/tests/helpers/buildContextForTest.js';
import { runCustomFunctionChecks } from '../helpers.js';

const root = mkdtempSync(join(tmpdir(), 'custom-function-check-integration-'));

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('runCustomFunctionChecks with Deno 2', () => {
  it('validates a generated project with the real runtime', async () => {
    const generated = prepareGeneratedCustomFunction('Integration Example', 'general');
    const manifestPath = join(root, 'transcend-functions.yml');
    const manifest = insertCustomFunctionManifestEntry(
      EMPTY_CUSTOM_FUNCTION_MANIFEST,
      generated.manifestEntry,
    );
    writeFileSync(manifestPath, manifest);
    [generated.sourceFile, ...generated.payloadFiles].forEach((file) => {
      const path = join(root, file.path);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, file.contents);
    });
    writeFileSync(
      join(root, 'deno.json'),
      mergeDenoConfiguration(null, CUSTOM_FUNCTION_TYPES_VERSION),
    );

    const result = await runCustomFunctionChecks(buildContextForTest({ cwd: root }), {
      manifestPath,
      fix: false,
    });

    expect(result.status, JSON.stringify(result, null, 2)).toBe('passed');
    expect(result.checks.every(({ status }) => status === 'passed')).toBe(true);
    expect(result.diagnostics.filter(({ severity }) => severity === 'error')).toEqual([]);
  }, 30_000);
});
