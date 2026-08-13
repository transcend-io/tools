import type { Got } from 'got';
import { print, type DocumentNode } from 'graphql';
import type { GraphQLClient } from 'graphql-request';
import { describe, expect, it, vi } from 'vitest';

import { injectDataSiloIntoDsrTestPayload } from '../injectDataSiloIntoDsrTestPayload.js';
import type { CustomFunctionExecutionResult } from '../runCustomFunctionTest.js';
import { syncCustomFunction } from '../syncCustomFunction.js';

const JWTS = { signedCodeJwt: 'a.b.c', signedCodeContextJwt: 'd.e.f' };

const DSR_INPUT = {
  name: 'DSR Lookup',
  code: 'export default async () => 1;\nexport async function enricher() {}',
  type: 'DSR' as const,
};

const TEST_PAYLOAD = {
  type: 'ACCESS',
  extras: {
    profile: { identifier: 'test@example.com' },
  },
};

const PASSING_RESULT: CustomFunctionExecutionResult = {
  exitCode: 0,
  error: null,
  logs: [],
  profile: { timeMs: 5 },
};

const FAILING_RESULT: CustomFunctionExecutionResult = {
  exitCode: 1,
  error: { message: 'enricher exploded' },
  logs: [],
  profile: { timeMs: 3 },
};

const SOMBRA = {
  post: vi.fn().mockReturnValue({ json: () => Promise.resolve(JWTS) }),
} as unknown as Got;

/**
 * Build a GraphQLClient stub that dispatches on the operation in the document.
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
    if (document.includes('createDataSilos')) {
      return Promise.resolve({
        createDataSilos: { dataSilos: [{ id: 'silo-new', title: 'DSR Lookup' }] },
      });
    }
    if (document.includes('deleteDataSilos')) {
      return Promise.resolve({ deleteDataSilos: { clientMutationId: null } });
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

/**
 * Find the variables of the first request whose document matches.
 *
 * @param request - The request spy
 * @param match - Substring to match in the document
 * @returns The variables of the matching call, if any
 */
function callVariables(
  request: ReturnType<typeof vi.fn>,
  match: string,
): Record<string, unknown> | undefined {
  const call = request.mock.calls.find(([document]) =>
    (typeof document === 'string' ? document : print(document as DocumentNode)).includes(match),
  );
  return call?.[1] as Record<string, unknown> | undefined;
}

describe('injectDataSiloIntoDsrTestPayload', () => {
  it('overrides the silo id, preserves other extras, defaults required codec fields', () => {
    const payload = {
      type: 'ACCESS',
      extras: {
        profile: { identifier: 'x' },
        dataSilo: { id: 'stale-id', link: 'https://keep.me' },
      },
    };
    const injected = injectDataSiloIntoDsrTestPayload(payload, {
      id: 'silo-new',
      title: 'DSR Lookup',
    }) as typeof payload & {
      /** Injected extras */
      extras: { dataSilo: Record<string, unknown>; profile: Record<string, unknown> };
    };
    expect(injected.extras.dataSilo).toEqual({
      id: 'silo-new',
      title: 'DSR Lookup',
      description: '',
      link: 'https://keep.me',
    });
    expect(injected.extras.profile).toEqual({ identifier: 'x' });
  });

  it('keeps title, description, and link already present in the payload', () => {
    const injected = injectDataSiloIntoDsrTestPayload(
      { extras: { dataSilo: { title: 'Custom Title', description: 'Mine', link: 'https://a' } } },
      { id: 'silo-new', title: 'Fallback' },
    ) as {
      /** Injected extras */
      extras: { dataSilo: Record<string, unknown> };
    };
    expect(injected.extras.dataSilo).toEqual({
      id: 'silo-new',
      title: 'Custom Title',
      description: 'Mine',
      link: 'https://a',
    });
  });
});

describe('syncCustomFunction DSR integration auto-create', () => {
  it('creates the silo before testing and links the function on a passing test', async () => {
    const { client, request } = makeClientStub(PASSING_RESULT);

    const result = await syncCustomFunction(client, {
      input: { ...DSR_INPUT, sombraId: 'sombra-eu' },
      sombra: SOMBRA,
      existing: [],
      testPayloads: [{ payload: TEST_PAYLOAD, payloadType: 'REQUEST_ENRICHER' }],
    });

    expect(result.outcome).toBe('created');
    expect(result.dataSiloId).toBe('silo-new');
    expect(result.createdDataSilo).toBe(true);

    // Silo created with the customFunction catalog against the entry's gateway
    const createSiloVariables = callVariables(request, 'createDataSilos');
    expect(createSiloVariables?.input).toEqual([
      { name: 'customFunction', title: 'DSR Lookup', sombraId: 'sombra-eu' },
    ]);

    // Test payload carried the new silo id
    const runVariables = callVariables(request, 'runCustomFunction') as {
      /** Mutation input */
      input: { payload: string; payloadType: string };
    };
    const decodedPayload = JSON.parse(
      Buffer.from(runVariables.input.payload, 'base64').toString('utf-8'),
    );
    expect(decodedPayload.extras.dataSilo).toEqual({
      id: 'silo-new',
      title: 'DSR Lookup',
      description: '',
      link: '',
    });
    expect(runVariables.input.payloadType).toBe('REQUEST_ENRICHER');

    // Function created linked to the new silo. Neither sombraId nor setActive
    // is sent — the backend rejects both for DSR functions (the data silo
    // dictates the gateway, and DSR functions are always created active)
    const createCfVariables = callVariables(request, 'createCustomFunction') as {
      /** Mutation input */
      input: { dataSiloId: string; sombraId?: string; setActive?: boolean };
    };
    expect(createCfVariables.input.dataSiloId).toBe('silo-new');
    expect(createCfVariables.input.sombraId).toBeUndefined();
    expect(createCfVariables.input.setActive).toBeUndefined();
    expect(result.promoted).toBe(true);

    // Order: silo created before the test ran
    const documents = request.mock.calls.map(([document]) => document as string);
    expect(documents.findIndex((d) => d.includes('createDataSilos'))).toBeLessThan(
      documents.findIndex((d) => d.includes('runCustomFunction')),
    );
  });

  it('rolls back the created silo when the test fails', async () => {
    const { client, request } = makeClientStub(FAILING_RESULT);

    const result = await syncCustomFunction(client, {
      input: { ...DSR_INPUT, sombraId: 'sombra-eu' },
      sombra: SOMBRA,
      existing: [],
      testPayloads: [{ payload: TEST_PAYLOAD }],
    });

    expect(result.outcome).toBe('test-failed');
    expect(result.createdDataSilo).toBe(true);
    expect(result.dataSiloId).toBeUndefined();

    const deleteVariables = callVariables(request, 'deleteDataSilos');
    expect(deleteVariables?.input).toEqual({ ids: ['silo-new'] });

    // No function was created
    const documents = request.mock.calls.map(([document]) => document as string);
    expect(documents.some((d) => d.includes('createCustomFunction'))).toBe(false);
  });

  it('falls back to the primary Sombra when no gateway is pinned', async () => {
    const { client, request } = makeClientStub(PASSING_RESULT);

    await syncCustomFunction(client, {
      input: DSR_INPUT,
      sombra: SOMBRA,
      existing: [],
      testPayloads: [{ payload: TEST_PAYLOAD }],
    });

    const createSiloVariables = callVariables(request, 'createDataSilos');
    expect(createSiloVariables?.input).toEqual([
      { name: 'customFunction', title: 'DSR Lookup', sombraId: 'sombra-primary' },
    ]);
  });

  it('tests both exports in one push and tags each result with its payload type', async () => {
    const { client, request } = makeClientStub(PASSING_RESULT);

    const result = await syncCustomFunction(client, {
      input: { ...DSR_INPUT, sombraId: 'sombra-eu' },
      sombra: SOMBRA,
      existing: [],
      testPayloads: [
        { payload: TEST_PAYLOAD, payloadType: 'DATA_POINT' },
        { payload: TEST_PAYLOAD, payloadType: 'REQUEST_ENRICHER' },
      ],
    });

    expect(result.outcome).toBe('created');
    expect(result.testResults?.map(({ payloadType, passed }) => ({ payloadType, passed }))).toEqual(
      [
        { payloadType: 'DATA_POINT', passed: true },
        { payloadType: 'REQUEST_ENRICHER', passed: true },
      ],
    );

    // Each run was invoked with its own payloadType and the injected silo
    const runCalls = request.mock.calls.filter(([document]) =>
      (typeof document === 'string' ? document : print(document as DocumentNode)).includes(
        'runCustomFunction',
      ),
    );
    expect(runCalls).toHaveLength(2);
    const payloadTypes = runCalls.map(
      (call) => (call[1] as { input: { payloadType: string } }).input.payloadType,
    );
    expect(payloadTypes).toEqual(['DATA_POINT', 'REQUEST_ENRICHER']);
    runCalls.forEach((call) => {
      const decoded = JSON.parse(
        Buffer.from((call[1] as { input: { payload: string } }).input.payload, 'base64').toString(
          'utf-8',
        ),
      );
      expect(decoded.extras.dataSilo.id).toBe('silo-new');
    });
  });

  it('does not create a silo when the entry pins a data-silo-id, but still injects it', async () => {
    const { client, request } = makeClientStub(PASSING_RESULT);

    const result = await syncCustomFunction(client, {
      input: { ...DSR_INPUT, dataSiloId: 'silo-existing' },
      sombra: SOMBRA,
      existing: [],
      testPayloads: [{ payload: TEST_PAYLOAD }],
    });

    expect(result.outcome).toBe('created');
    expect(result.dataSiloId).toBe('silo-existing');
    expect(result.createdDataSilo).toBeUndefined();

    const documents = request.mock.calls.map(([document]) => document as string);
    expect(documents.some((d) => d.includes('createDataSilos'))).toBe(false);

    const runVariables = callVariables(request, 'runCustomFunction') as {
      /** Mutation input */
      input: { payload: string };
    };
    const decodedPayload = JSON.parse(
      Buffer.from(runVariables.input.payload, 'base64').toString('utf-8'),
    );
    expect(decodedPayload.extras.dataSilo.id).toBe('silo-existing');
  });

  it('creates the integration even without a test payload', async () => {
    const { client, request } = makeClientStub(PASSING_RESULT);

    const result = await syncCustomFunction(client, {
      input: DSR_INPUT,
      sombra: SOMBRA,
      existing: [],
    });

    expect(result.outcome).toBe('created');
    expect(result.dataSiloId).toBe('silo-new');
    expect(result.createdDataSilo).toBe(true);

    const documents = request.mock.calls.map(([document]) =>
      typeof document === 'string' ? document : print(document as DocumentNode),
    );
    expect(documents.some((d) => d.includes('runCustomFunction'))).toBe(false);
  });
});
