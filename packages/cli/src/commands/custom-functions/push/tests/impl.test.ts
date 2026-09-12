import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CustomFunctionSyncResult } from '@transcend-io/sdk';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildContextForTest } from '../../../../lib/tests/helpers/buildContextForTest.js';
import { push, type CustomFunctionsPushCommandFlags } from '../impl.js';

const { buildTranscendGraphQLClientMock, fetchAllCustomFunctionsMock, syncCustomFunctionMock } =
  vi.hoisted(() => ({
    buildTranscendGraphQLClientMock: vi.fn(),
    fetchAllCustomFunctionsMock: vi.fn(),
    syncCustomFunctionMock: vi.fn(),
  }));

vi.mock('@transcend-io/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@transcend-io/sdk')>();
  return {
    ...actual,
    buildTranscendGraphQLClient: buildTranscendGraphQLClientMock,
    fetchAllCustomFunctions: fetchAllCustomFunctionsMock,
    syncCustomFunction: syncCustomFunctionMock,
  };
});

const temporaryRoots: string[] = [];

/**
 * Create and register an isolated repository root.
 *
 * @returns Temporary root
 */
function makeTemporaryRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'custom-function-push-'));
  temporaryRoots.push(root);
  return root;
}

/** Build complete push flags for a dry run. */
function buildFlags(): CustomFunctionsPushCommandFlags {
  return {
    auth: 'test-api-key',
    transcendUrl: 'https://api.transcend.io',
    variables: '',
    dryRun: true,
    json: true,
    promote: true,
    force: false,
    skipTests: false,
    updateManifest: false,
  };
}

afterEach(() => {
  temporaryRoots.splice(0).forEach((root) => {
    rmSync(root, { recursive: true, force: true });
  });
  vi.clearAllMocks();
});

describe('custom-functions push', () => {
  it('uses the shared default project and emits only JSON on stdout', async () => {
    const root = makeTemporaryRoot();
    const project = join(root, 'transcend', 'custom-functions');
    const manifestPath = join(project, 'transcend-functions.yml');
    mkdirSync(project, { recursive: true });
    writeFileSync(
      manifestPath,
      `functions:
  - name: Example
    code: ./example.ts
`,
    );
    writeFileSync(join(project, 'example.ts'), 'export default () => undefined;\n');
    buildTranscendGraphQLClientMock.mockReturnValue({});
    fetchAllCustomFunctionsMock.mockResolvedValue([]);
    syncCustomFunctionMock.mockResolvedValue({
      outcome: 'would-create',
      changedFields: [],
      promoted: false,
    } satisfies CustomFunctionSyncResult);
    const context = buildContextForTest({ cwd: root, stdinIsTTY: false });

    await push.call(context, buildFlags());

    expect(JSON.parse(context.stdout)).toMatchObject({
      version: 1,
      command: 'push',
      status: 'passed',
      manifestPath,
      dryRun: true,
      summary: {
        created: 1,
        failed: 0,
      },
      functions: [{ name: 'Example', result: { outcome: 'would-create' } }],
    });
    expect(context.stderr).toBe('');
  });
});
