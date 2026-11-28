import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { CustomFunctionType } from '@transcend-io/privacy-types';
import type { CustomFunction, CustomFunctionSyncResult } from '@transcend-io/sdk';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildContextForTest } from '../../../../lib/tests/helpers/buildContextForTest.js';
import { push } from '../../push/impl.js';
import { pull, type CustomFunctionsPullCommandFlags } from '../impl.js';

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
  const root = mkdtempSync(join(tmpdir(), 'custom-function-pull-'));
  temporaryRoots.push(root);
  return root;
}

/**
 * Encode a fake JWT with the given payload.
 *
 * @param payload - JWT payload
 * @returns Unsigned JWT string
 */
function fakeJwt(payload: object): string {
  const encode = (value: object): string =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS384' })}.${encode(payload)}.signature`;
}

const CODE = 'export default async () => ({ ok: true });\n';

const SOURCE_ORG_FUNCTION: CustomFunction = {
  id: 'source-org-function',
  name: 'DSR Lookup',
  type: CustomFunctionType.Dsr,
  dataSiloId: 'source-org-silo',
  sombraId: 'source-org-sombra',
  lifecycleState: 'ACTIVE' as never,
  signedCodeJwt: fakeJwt({ base64Code: Buffer.from(CODE).toString('base64') }),
  signedCodeContextJwt: fakeJwt({ userDefinedEncryptedEnv: { CRM_API_KEY: 'encrypted' } }),
  hasPendingDraft: false,
};

/** Build complete pull flags. */
function buildFlags(): CustomFunctionsPullCommandFlags {
  return {
    auth: 'test-api-key',
    transcendUrl: 'https://api.transcend.io',
    force: false,
    includeIds: false,
    json: true,
  };
}

afterEach(() => {
  temporaryRoots.splice(0).forEach((root) => {
    rmSync(root, { recursive: true, force: true });
  });
  vi.clearAllMocks();
});

describe('custom-functions pull', () => {
  it('writes a manifest that push accepts in another organization', async () => {
    const root = makeTemporaryRoot();
    const project = join(root, 'transcend', 'custom-functions');
    buildTranscendGraphQLClientMock.mockReturnValue({});
    fetchAllCustomFunctionsMock.mockResolvedValueOnce([SOURCE_ORG_FUNCTION]);

    const pullContext = buildContextForTest({ cwd: root, stdinIsTTY: false });
    await pull.call(pullContext, buildFlags());

    expect(JSON.parse(pullContext.stdout)).toMatchObject({
      command: 'pull',
      added: ['DSR Lookup'],
      variables: ['CRM_API_KEY'],
      files: ['functions/dsr-lookup.ts'],
    });
    expect(readFileSync(join(project, 'functions', 'dsr-lookup.ts'), 'utf-8')).toBe(CODE);
    const manifest = readFileSync(join(project, 'transcend-functions.yml'), 'utf-8');
    expect(manifest).not.toContain('source-org');
    expect(manifest).toContain('<<parameters.CRM_API_KEY>>');

    fetchAllCustomFunctionsMock.mockResolvedValue([]);
    syncCustomFunctionMock.mockResolvedValue({
      outcome: 'would-create',
      changedFields: [],
      promoted: false,
    } satisfies CustomFunctionSyncResult);
    const pushFlags = {
      auth: 'target-api-key',
      transcendUrl: 'https://api.transcend.io',
      dryRun: true,
      json: true,
      promote: true,
      force: false,
      skipTests: false,
      updateManifest: false,
    };

    await expect(
      push.call(buildContextForTest({ cwd: root, stdinIsTTY: false }), {
        ...pushFlags,
        variables: '',
      }),
    ).rejects.toThrow('CRM_API_KEY');

    await push.call(buildContextForTest({ cwd: root, stdinIsTTY: false }), {
      ...pushFlags,
      variables: 'CRM_API_KEY:target-secret',
    });
    const [, { input: config }] = syncCustomFunctionMock.mock.calls[0]!;
    expect(config).toMatchObject({
      name: 'DSR Lookup',
      type: CustomFunctionType.Dsr,
      code: CODE,
      env: { CRM_API_KEY: 'target-secret' },
    });
    expect(config).not.toHaveProperty('id');
    expect(config).not.toHaveProperty('dataSiloId');
    expect(config).not.toHaveProperty('sombraId');
  });

  it('refuses to overwrite untracked files without --force', async () => {
    const root = makeTemporaryRoot();
    buildTranscendGraphQLClientMock.mockReturnValue({});
    fetchAllCustomFunctionsMock.mockResolvedValue([SOURCE_ORG_FUNCTION]);
    await pull.call(buildContextForTest({ cwd: root, stdinIsTTY: false }), buildFlags());
    rmSync(join(root, 'transcend', 'custom-functions', 'transcend-functions.yml'));

    const context = buildContextForTest({ cwd: root, stdinIsTTY: false });
    await expect(pull.call(context, buildFlags())).rejects.toThrow('Process exited with code 1');
    expect(context.stderr).toContain('functions/dsr-lookup.ts');
    expect(existsSync(join(root, 'transcend', 'custom-functions', 'transcend-functions.yml'))).toBe(
      false,
    );
  });
});
