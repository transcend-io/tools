import type { Got } from 'got';
import type { GraphQLClient } from 'graphql-request';
import { describe, expect, it, vi } from 'vitest';

import type { CustomFunctionExecutionResult } from '../runCustomFunctionTest.js';
import { syncCustomFunction } from '../syncCustomFunction.js';

const JWTS = { signedCodeJwt: 'a.b.c', signedCodeContextJwt: 'd.e.f' };

const INPUT = {
  name: 'Score lead',
  code: 'export default async () => 42;',
};

const PASSING_RESULT: CustomFunctionExecutionResult = {
  exitCode: 0,
  error: null,
  logs: [],
  profile: { timeMs: 5 },
};

const FAILING_RESULT: CustomFunctionExecutionResult = {
  exitCode: 1,
  error: { message: 'Cannot read properties of undefined' },
  logs: [{ message: 'kaboom', file: 'stderr' }],
  profile: { timeMs: 3 },
};

const SOMBRA = {
  post: vi.fn().mockReturnValue({ json: () => Promise.resolve(JWTS) }),
} as unknown as Got;

/**
 * Build a GraphQLClient stub that dispatches on the mutation in the document.
 *
 * @param testResult - The execution result the runCustomFunction mutation returns
 * @returns The stub and a spy on `request`
 */
function makeClientStub(testResult: CustomFunctionExecutionResult): {
  /** The client stub */
  client: GraphQLClient;
  /** Spy on request */
  request: ReturnType<typeof vi.fn>;
} {
  const request = vi.fn().mockImplementation((document: string) => {
    if (document.includes('runCustomFunction')) {
      return Promise.resolve({ runCustomFunction: { result: testResult } });
    }
    if (document.includes('createCustomFunction')) {
      return Promise.resolve({
        createCustomFunction: {
          customFunction: {
            id: 'cf-1',
            activeVersion: { id: 'v-1', versionNumber: '1.0' },
            draftVersion: null,
          },
          success: true,
        },
      });
    }
    throw new Error(`Unexpected GraphQL document: ${document}`);
  });
  return { client: { request } as unknown as GraphQLClient, request };
}

describe('syncCustomFunction test gating', () => {
  it('rejects the push with outcome test-failed when the test fails', async () => {
    const { client, request } = makeClientStub(FAILING_RESULT);

    const result = await syncCustomFunction(client, {
      input: INPUT,
      sombra: SOMBRA,
      existing: [],
      testPayload: { lead: {} },
    });

    expect(result.outcome).toBe('test-failed');
    expect(result.promoted).toBe(false);
    expect(result.testResult?.passed).toBe(false);
    expect(result.testResult?.result.error?.message).toBe('Cannot read properties of undefined');
    // No create/update mutation was sent
    const documents = request.mock.calls.map(([document]) => document as string);
    expect(documents.some((document) => document.includes('createCustomFunction'))).toBe(false);
  });

  it('pushes and attaches the test result when the test passes', async () => {
    const { client, request } = makeClientStub(PASSING_RESULT);

    const result = await syncCustomFunction(client, {
      input: { ...INPUT, sombraId: 'sombra-1' },
      sombra: SOMBRA,
      existing: [],
      testPayload: { lead: {} },
    });

    expect(result.outcome).toBe('created');
    expect(result.testResult?.passed).toBe(true);

    // The test run used the freshly signed JWTs and the function's gateway
    const runCall = request.mock.calls.find(([document]) =>
      (document as string).includes('runCustomFunction'),
    );
    expect(runCall?.[1].input).toMatchObject({
      ...JWTS,
      isCustomFunctionTestRun: true,
      sombraId: 'sombra-1',
    });
  });

  it('does not test when no test payload is provided', async () => {
    const { client, request } = makeClientStub(PASSING_RESULT);

    const result = await syncCustomFunction(client, {
      input: INPUT,
      sombra: SOMBRA,
      existing: [],
    });

    expect(result.outcome).toBe('created');
    expect(result.testResult).toBeUndefined();
    const documents = request.mock.calls.map(([document]) => document as string);
    expect(documents.some((document) => document.includes('runCustomFunction'))).toBe(false);
  });
});
