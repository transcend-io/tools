import type { CustomFunction } from '@transcend-io/sdk';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildContextForTest } from '../../../../lib/tests/helpers/buildContextForTest.js';
import { list } from '../impl.js';

const { buildTranscendGraphQLClientMock, fetchAllCustomFunctionsMock } = vi.hoisted(() => ({
  buildTranscendGraphQLClientMock: vi.fn(),
  fetchAllCustomFunctionsMock: vi.fn(),
}));

vi.mock('@transcend-io/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@transcend-io/sdk')>();
  return {
    ...actual,
    buildTranscendGraphQLClient: buildTranscendGraphQLClientMock,
    fetchAllCustomFunctions: fetchAllCustomFunctionsMock,
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('custom-functions list', () => {
  it('emits safe JSON without human progress output', async () => {
    const customFunctions: CustomFunction[] = [
      {
        id: 'function-1',
        name: 'Example',
        type: 'GENERAL',
        lifecycleState: 'ACTIVE',
        signedCodeJwt: 'preferred-code-secret',
        signedCodeContextJwt: 'preferred-context-secret',
        hasPendingDraft: false,
      },
    ];
    buildTranscendGraphQLClientMock.mockReturnValue({});
    fetchAllCustomFunctionsMock.mockResolvedValue(customFunctions);
    const context = buildContextForTest({ stdinIsTTY: false });

    await list.call(context, {
      auth: 'test-api-key',
      transcendUrl: 'https://api.transcend.io',
      json: true,
    });

    const output = JSON.parse(context.stdout);
    expect(output).toMatchObject({
      version: 1,
      command: 'list',
      functions: [{ id: 'function-1', name: 'Example' }],
    });
    expect(context.stdout).not.toContain('secret');
    expect(context.stderr).toBe('');
  });
});
