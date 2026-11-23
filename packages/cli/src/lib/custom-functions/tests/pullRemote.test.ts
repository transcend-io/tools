import { CustomFunctionType } from '@transcend-io/privacy-types';
import { describe, expect, it } from 'vitest';

import { buildCustomFunctionPullPlan, preferredSignedCodeJwt } from '../pullRemote.js';

function fakeJwt(payload: object): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS384', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.signature`;
}

const CODE = 'export default async () => ({ ok: true });';

describe('buildCustomFunctionPullPlan', () => {
  it('decodes active code into functions/*.ts entries', () => {
    const signedCodeJwt = fakeJwt({
      base64Code: Buffer.from(CODE, 'utf-8').toString('base64'),
    });
    const signedCodeContextJwt = fakeJwt({ allowedHosts: ['api.example.com'] });

    const plan = buildCustomFunctionPullPlan([
      {
        id: 'cf-1',
        name: 'Lookup User',
        type: CustomFunctionType.General,
        lifecycleState: 'ACTIVE' as never,
        signedCodeJwt,
        signedCodeContextJwt,
        hasPendingDraft: false,
        activeVersion: {
          id: 'v1',
          versionNumber: '1.0',
          lifecycleState: 'ACTIVE' as never,
          signedCodeJwt,
        },
      },
    ]);

    expect(plan.functions).toHaveLength(1);
    expect(plan.functions[0]?.code).toMatch(/^functions\//);
    expect(plan.files[0]?.contents).toBe(CODE);
    expect(plan.functions[0]?.['allowed-hosts']).toEqual(['api.example.com']);
    expect(plan.skipped).toEqual([]);
  });

  it('prefers draft JWT when a pending draft exists', () => {
    const activeJwt = fakeJwt({ base64Code: Buffer.from('old', 'utf-8').toString('base64') });
    const draftJwt = fakeJwt({ base64Code: Buffer.from('new', 'utf-8').toString('base64') });

    const cf = {
      id: 'cf-1',
      name: 'Fn',
      type: CustomFunctionType.General,
      lifecycleState: 'ACTIVE' as never,
      signedCodeJwt: activeJwt,
      signedCodeContextJwt: fakeJwt({}),
      hasPendingDraft: true,
      activeVersion: {
        id: 'v1',
        versionNumber: '1.0',
        lifecycleState: 'ACTIVE' as never,
        signedCodeJwt: activeJwt,
      },
      draftVersion: {
        id: 'v2',
        versionNumber: '2.0',
        lifecycleState: 'DRAFT' as never,
        signedCodeJwt: draftJwt,
      },
    };

    expect(preferredSignedCodeJwt(cf)).toBe(draftJwt);
    expect(buildCustomFunctionPullPlan([cf]).files[0]?.contents).toBe('new');
  });
});
