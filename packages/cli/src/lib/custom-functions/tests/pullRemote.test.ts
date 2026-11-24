import { CustomFunctionType } from '@transcend-io/privacy-types';
import type { CustomFunction } from '@transcend-io/sdk';
import { describe, expect, it } from 'vitest';

import { parseCustomFunctionsManifest } from '../manifest.js';
import {
  buildCustomFunctionPullPlan,
  mergeCustomFunctionPullIntoManifest,
  preferredSignedCodeJwt,
} from '../pullRemote.js';

function fakeJwt(payload: object): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS384', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.signature`;
}

function codeJwt(code: string): string {
  return fakeJwt({ base64Code: Buffer.from(code, 'utf-8').toString('base64') });
}

const CODE = 'export default async () => ({ ok: true });';

function remoteFunction(overrides: Partial<CustomFunction> = {}): CustomFunction {
  const signedCodeJwt = overrides.signedCodeJwt ?? codeJwt(CODE);
  return {
    id: 'cf-1',
    name: 'Lookup User',
    type: CustomFunctionType.General,
    lifecycleState: 'ACTIVE' as never,
    signedCodeJwt,
    signedCodeContextJwt: fakeJwt({ allowedHosts: ['api.example.com'] }),
    hasPendingDraft: false,
    activeVersion: {
      id: 'v1',
      versionNumber: '1.0',
      lifecycleState: 'ACTIVE' as never,
      signedCodeJwt,
    },
    ...overrides,
  };
}

describe('buildCustomFunctionPullPlan', () => {
  it('decodes active code and context', () => {
    const plan = buildCustomFunctionPullPlan([remoteFunction()]);

    expect(plan.items).toHaveLength(1);
    expect(plan.items[0]?.source).toBe(CODE);
    expect(plan.items[0]?.slug).toBe('lookup-user');
    expect(plan.items[0]?.entry['allowed-hosts']).toEqual(['api.example.com']);
    expect(plan.skipped).toEqual([]);
  });

  it('prefers draft JWT when a pending draft exists', () => {
    const draftJwt = codeJwt('new');
    const cf = remoteFunction({
      signedCodeJwt: codeJwt('old'),
      hasPendingDraft: true,
      draftVersion: {
        id: 'v2',
        versionNumber: '2.0',
        lifecycleState: 'DRAFT' as never,
        signedCodeJwt: draftJwt,
      },
    });

    expect(preferredSignedCodeJwt(cf)).toBe(draftJwt);
    expect(buildCustomFunctionPullPlan([cf]).items[0]?.source).toBe('new');
  });

  it('leaves out org-specific IDs unless includeIds is set', () => {
    const cf = remoteFunction({
      type: CustomFunctionType.Dsr,
      dataSiloId: 'silo-1',
      sombraId: 'sombra-1',
    });

    const portable = buildCustomFunctionPullPlan([cf]).items[0]?.entry;
    expect(portable).not.toHaveProperty('id');
    expect(portable).not.toHaveProperty('data-silo-id');
    expect(portable).not.toHaveProperty('sombra-id');

    const backup = buildCustomFunctionPullPlan([cf], { includeIds: true }).items[0]?.entry;
    expect(backup).toMatchObject({
      id: 'cf-1',
      'data-silo-id': 'silo-1',
      'sombra-id': 'sombra-1',
    });
  });

  it('writes encrypted env keys as parameter placeholders', () => {
    const plan = buildCustomFunctionPullPlan([
      remoteFunction({
        signedCodeContextJwt: fakeJwt({
          userDefinedEncryptedEnv: { CRM_API_KEY: 'enc', TRANSCEND_API_KEY: 'enc' },
        }),
      }),
    ]);

    expect(plan.items[0]?.entry.env).toEqual({
      CRM_API_KEY: '<<parameters.CRM_API_KEY>>',
      TRANSCEND_API_KEY: '<<parameters.TRANSCEND_API_KEY>>',
    });
    expect(plan.variables).toEqual(['CRM_API_KEY', 'TRANSCEND_API_KEY']);
  });

  it('skips functions that share a name unless includeIds is set', () => {
    const functions = [remoteFunction(), remoteFunction({ id: 'cf-2' })];

    const portable = buildCustomFunctionPullPlan(functions);
    expect(portable.items).toEqual([]);
    expect(portable.duplicateNames).toEqual(['Lookup User']);

    expect(buildCustomFunctionPullPlan(functions, { includeIds: true }).items).toHaveLength(2);
  });
});

describe('mergeCustomFunctionPullIntoManifest', () => {
  it('creates a manifest when none exists', () => {
    const plan = buildCustomFunctionPullPlan([remoteFunction()]);
    const merged = mergeCustomFunctionPullIntoManifest(undefined, plan, { force: false });

    expect(merged.added).toEqual(['Lookup User']);
    expect(merged.files).toEqual([
      { path: 'functions/lookup-user.ts', contents: CODE, isNew: true },
    ]);
    expect(parseCustomFunctionsManifest(merged.contents).functions).toEqual([
      {
        name: 'Lookup User',
        code: 'functions/lookup-user.ts',
        'allowed-hosts': ['api.example.com'],
      },
    ]);
  });

  it('appends new functions and keeps comments and existing entries', () => {
    const existing = `# managed by init
functions:
  - name: Score Lead
    code: ./functions/score-lead.ts
    env:
      CRM_API_KEY: <<parameters.CRM_API_KEY>>
`;
    const plan = buildCustomFunctionPullPlan([remoteFunction()]);
    const merged = mergeCustomFunctionPullIntoManifest(existing, plan, { force: false });

    expect(merged.contents).toContain('# managed by init');
    expect(merged.contents).toContain('<<parameters.CRM_API_KEY>>');
    expect(parseCustomFunctionsManifest(merged.contents).functions.map(({ name }) => name)).toEqual(
      ['Score Lead', 'Lookup User'],
    );
  });

  it('leaves matched entries alone without force', () => {
    const existing = `functions:
  - name: Lookup User
    code: ./src/lookup.ts
    timeout-ms: 5000
`;
    const plan = buildCustomFunctionPullPlan([remoteFunction()]);
    const merged = mergeCustomFunctionPullIntoManifest(existing, plan, { force: false });

    expect(merged.kept).toEqual(['Lookup User']);
    expect(merged.files).toEqual([]);
    expect(merged.contents).toBe(existing);
  });

  it('refreshes matched entries with force and keeps local-only fields', () => {
    const existing = `functions:
  - id: target-org-id
    name: Lookup User
    code: ./src/lookup.ts
    timeout-ms: 5000
    test-payload: ./payloads/lookup.json
    env:
      LOCAL_ONLY: <<parameters.LOCAL_ONLY>>
`;
    const plan = buildCustomFunctionPullPlan([
      remoteFunction({
        signedCodeContextJwt: fakeJwt({
          allowedHosts: ['api.example.com'],
          userDefinedEncryptedEnv: { CRM_API_KEY: 'enc' },
        }),
      }),
    ]);
    const merged = mergeCustomFunctionPullIntoManifest(existing, plan, { force: true });

    expect(merged.updated).toEqual(['Lookup User']);
    expect(merged.files).toEqual([{ path: 'src/lookup.ts', contents: CODE, isNew: false }]);
    expect(parseCustomFunctionsManifest(merged.contents).functions).toEqual([
      {
        id: 'target-org-id',
        name: 'Lookup User',
        code: './src/lookup.ts',
        'test-payload': './payloads/lookup.json',
        env: {
          LOCAL_ONLY: '<<parameters.LOCAL_ONLY>>',
          CRM_API_KEY: '<<parameters.CRM_API_KEY>>',
        },
        'allowed-hosts': ['api.example.com'],
      },
    ]);
  });

  it('matches by id before name', () => {
    const existing = `functions:
  - id: cf-1
    name: Old Name
    code: ./functions/old-name.ts
`;
    const plan = buildCustomFunctionPullPlan([remoteFunction()], { includeIds: true });
    const merged = mergeCustomFunctionPullIntoManifest(existing, plan, { force: false });

    expect(merged.kept).toEqual(['Lookup User']);
    expect(merged.added).toEqual([]);
  });

  it('picks a free file name when the slug path is taken', () => {
    const existing = `functions:
  - name: Something Else
    code: ./functions/lookup-user.ts
`;
    const plan = buildCustomFunctionPullPlan([remoteFunction()]);
    const merged = mergeCustomFunctionPullIntoManifest(existing, plan, { force: false });

    expect(merged.files[0]?.path).toBe('functions/lookup-user-2.ts');
  });
});
