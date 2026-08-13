import { CustomFunctionType } from '@transcend-io/privacy-types';
import type { Got } from 'got';
import { print, type DocumentNode } from 'graphql';
import type { GraphQLClient } from 'graphql-request';
import { describe, expect, it, vi } from 'vitest';

import type { CustomFunction } from '../fetchAllCustomFunctions.js';
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
 * Normalize a GraphQL document (string or parsed DocumentNode) to a string.
 *
 * @param document - The document
 * @returns The document as a string
 */
const toDocumentString = (document: unknown): string =>
  typeof document === 'string' ? document : print(document as DocumentNode);

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
  const request = vi.fn().mockImplementation((rawDocument: string | DocumentNode) => {
    const document = typeof rawDocument === 'string' ? rawDocument : print(rawDocument);
    if (document.includes('runCustomFunction')) {
      return Promise.resolve({ runCustomFunction: { result: testResult } });
    }
    if (document.includes('TranscendCliOrganization')) {
      return Promise.resolve({
        organization: {
          sombra: { id: 'sombra-primary', customerUrl: 'https://sombra.example' },
          sombras: [],
        },
      });
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
      testPayloads: [{ payload: { lead: {} } }],
    });

    expect(result.outcome).toBe('test-failed');
    expect(result.promoted).toBe(false);
    expect(result.testResults?.[0]?.passed).toBe(false);
    expect(result.testResults?.[0]?.result.error?.message).toBe(
      'Cannot read properties of undefined',
    );
    // No create/update mutation was sent
    const documents = request.mock.calls.map(([document]) => toDocumentString(document));
    expect(documents.some((document) => document.includes('createCustomFunction'))).toBe(false);
  });

  it('pushes and attaches the test result when the test passes', async () => {
    const { client, request } = makeClientStub(PASSING_RESULT);

    const result = await syncCustomFunction(client, {
      input: { ...INPUT, sombraId: 'sombra-1' },
      sombra: SOMBRA,
      existing: [],
      testPayloads: [{ payload: { lead: {} } }],
    });

    expect(result.outcome).toBe('created');
    expect(result.testResults?.[0]?.passed).toBe(true);

    // The test run used the freshly signed JWTs and the function's gateway
    const runCall = request.mock.calls.find(([document]) =>
      toDocumentString(document).includes('runCustomFunction'),
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
    expect(result.testResults).toBeUndefined();
    const documents = request.mock.calls.map(([document]) => toDocumentString(document));
    expect(documents.some((document) => document.includes('runCustomFunction'))).toBe(false);
  });

  it('runs every payload and reports all results when one fails', async () => {
    const runResults = [PASSING_RESULT, FAILING_RESULT];
    let runCount = 0;
    const request = vi.fn().mockImplementation((rawDocument: string | DocumentNode) => {
      const document = typeof rawDocument === 'string' ? rawDocument : print(rawDocument);
      if (document.includes('runCustomFunction')) {
        runCount += 1;
        return Promise.resolve({ runCustomFunction: { result: runResults[runCount - 1] } });
      }
      throw new Error(`Unexpected GraphQL document: ${document}`);
    });
    const client = { request } as unknown as GraphQLClient;

    const result = await syncCustomFunction(client, {
      input: { ...INPUT, sombraId: 'sombra-1' },
      sombra: SOMBRA,
      existing: [],
      testPayloads: [{ payload: { case: 1 } }, { payload: { case: 2 } }],
    });

    // Both payloads ran even though only the second failed, so one CI run
    // reports every failing case
    expect(runCount).toBe(2);
    expect(result.outcome).toBe('test-failed');
    expect(result.testResults?.map(({ passed }) => passed)).toEqual([true, false]);
    // Nothing was pushed
    const documents = request.mock.calls.map(([document]) => toDocumentString(document));
    expect(documents.some((document) => document.includes('createCustomFunction'))).toBe(false);
  });

  it('falls back to the primary Sombra when creating a GENERAL function without a gateway', async () => {
    const { client, request } = makeClientStub(PASSING_RESULT);

    // No sombraId on the input and no defaultSombraId — the backend requires
    // an explicit gateway for GENERAL creates, so the primary is resolved
    const result = await syncCustomFunction(client, {
      input: INPUT,
      sombra: SOMBRA,
      existing: [],
    });

    expect(result.outcome).toBe('created');
    const createCall = request.mock.calls.find(([document]) =>
      toDocumentString(document).includes('createCustomFunction'),
    );
    expect(createCall?.[1].input).toMatchObject({ sombraId: 'sombra-primary' });
  });

  it('sends the pinned gateway when creating a GENERAL function', async () => {
    const { client, request } = makeClientStub(PASSING_RESULT);

    const result = await syncCustomFunction(client, {
      input: { ...INPUT, sombraId: 'sombra-1' },
      sombra: SOMBRA,
      existing: [],
    });

    expect(result.outcome).toBe('created');
    const createCall = request.mock.calls.find(([document]) =>
      toDocumentString(document).includes('createCustomFunction'),
    );
    expect(createCall?.[1].input).toMatchObject({ sombraId: 'sombra-1' });
    // The primary gateway was never looked up
    const documents = request.mock.calls.map(([document]) => toDocumentString(document));
    expect(documents.some((document) => document.includes('TranscendCliOrganization'))).toBe(false);
  });
});

const base64Url = (payload: object): string =>
  Buffer.from(JSON.stringify(payload)).toString('base64url');

/**
 * Build an unsigned JWT whose payload decodes like a Sombra-signed one.
 *
 * @param payload - The JWT payload
 * @returns A three-part JWT string (signature is not verified by the diff)
 */
const fakeJwt = (payload: object): string =>
  `${base64Url({ alg: 'HS256', typ: 'JWT' })}.${base64Url(payload)}.sig`;

/**
 * An existing GENERAL function whose stored JWTs match {@link INPUT} exactly,
 * so the code/context diff reports no changes.
 *
 * @param overrides - Field overrides
 * @returns The existing custom function
 */
const makeExisting = (overrides: Partial<CustomFunction> = {}): CustomFunction =>
  ({
    id: 'cf-1',
    name: INPUT.name,
    description: 'Old description',
    type: CustomFunctionType.General,
    sombraId: null,
    dataSiloId: null,
    signedCodeJwt: fakeJwt({ base64Code: Buffer.from(INPUT.code, 'utf-8').toString('base64') }),
    signedCodeContextJwt: fakeJwt({}),
    hasPendingDraft: false,
    ...overrides,
  }) as CustomFunction;

describe('syncCustomFunction metadata-only updates', () => {
  it('updates the description in place without signing or pushing a revision', async () => {
    const sombraPost = vi.fn();
    const request = vi.fn().mockImplementation((rawDocument: string | DocumentNode) => {
      const document = toDocumentString(rawDocument);
      if (document.includes('updateStandaloneCustomFunction')) {
        return Promise.resolve({
          updateStandaloneCustomFunction: {
            customFunction: { id: 'cf-1', draftVersion: null },
          },
        });
      }
      throw new Error(`Unexpected GraphQL document: ${document}`);
    });
    const client = { request } as unknown as GraphQLClient;

    const result = await syncCustomFunction(client, {
      input: { ...INPUT, description: 'New description' },
      sombra: { post: sombraPost } as unknown as Got,
      existing: [makeExisting()],
      testPayloads: [{ payload: { lead: {} } }],
    });

    expect(result.outcome).toBe('metadata-updated');
    expect(result.changedFields).toEqual(['description']);
    expect(result.promoted).toBe(false);

    // Only the metadata mutation ran — no signing, no test runs, no promote
    expect(sombraPost).not.toHaveBeenCalled();
    const updateCall = request.mock.calls.find(([document]) =>
      toDocumentString(document).includes('updateStandaloneCustomFunction'),
    );
    expect(updateCall?.[1].input).toEqual({
      id: 'cf-1',
      name: INPUT.name,
      description: 'New description',
    });
  });

  it('detects a rename for id-pinned entries', async () => {
    const request = vi.fn().mockImplementation((rawDocument: string | DocumentNode) => {
      const document = toDocumentString(rawDocument);
      if (document.includes('updateStandaloneCustomFunction')) {
        return Promise.resolve({
          updateStandaloneCustomFunction: {
            customFunction: { id: 'cf-1', draftVersion: null },
          },
        });
      }
      throw new Error(`Unexpected GraphQL document: ${document}`);
    });
    const client = { request } as unknown as GraphQLClient;

    const result = await syncCustomFunction(client, {
      input: { ...INPUT, id: 'cf-1', name: 'Score lead v2' },
      sombra: SOMBRA,
      existing: [makeExisting()],
    });

    expect(result.outcome).toBe('metadata-updated');
    expect(result.changedFields).toEqual(['name']);
  });

  it('still skips when code and metadata are both unchanged', async () => {
    const request = vi.fn();
    const client = { request } as unknown as GraphQLClient;

    const result = await syncCustomFunction(client, {
      input: { ...INPUT, description: 'Old description' },
      sombra: SOMBRA,
      existing: [makeExisting()],
    });

    expect(result.outcome).toBe('skipped');
    expect(request).not.toHaveBeenCalled();
  });

  it('reports metadata changes on dry runs without mutating anything', async () => {
    const request = vi.fn();
    const client = { request } as unknown as GraphQLClient;

    const result = await syncCustomFunction(client, {
      input: { ...INPUT, description: 'New description' },
      existing: [makeExisting()],
      dryRun: true,
    });

    expect(result.outcome).toBe('would-update');
    expect(result.changedFields).toEqual(['description']);
    expect(request).not.toHaveBeenCalled();
  });
});
