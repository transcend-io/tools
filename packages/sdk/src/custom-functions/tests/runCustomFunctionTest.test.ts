import type { GraphQLClient } from 'graphql-request';
import { describe, expect, it, vi } from 'vitest';

import {
  didCustomFunctionTestPass,
  runCustomFunctionTest,
  type CustomFunctionExecutionResult,
} from '../runCustomFunctionTest.js';

const JWTS = { signedCodeJwt: 'a.b.c', signedCodeContextJwt: 'd.e.f' };

const PASSING_RESULT: CustomFunctionExecutionResult = {
  exitCode: 0,
  error: null,
  logs: [{ message: 'ok', file: 'stdout' }],
  profile: { timeMs: 12 },
};

const FAILING_RESULT: CustomFunctionExecutionResult = {
  exitCode: 1,
  error: { message: 'Boom', stack: 'Error: Boom\n  at main' },
  logs: [{ message: 'about to explode', file: 'stderr' }],
  profile: { timeMs: 8 },
};

/**
 * Build a GraphQLClient stub whose `request` resolves or rejects.
 *
 * @param result - The execution result to resolve with, or an error to reject with
 * @returns The stub and a spy on `request`
 */
function makeClientStub(result: CustomFunctionExecutionResult | Error): {
  /** The client stub */
  client: GraphQLClient;
  /** Spy on request */
  request: ReturnType<typeof vi.fn>;
} {
  const request =
    result instanceof Error
      ? vi.fn().mockRejectedValue(result)
      : vi.fn().mockResolvedValue({ runCustomFunction: { result } });
  return { client: { request } as unknown as GraphQLClient, request };
}

describe('didCustomFunctionTestPass', () => {
  it('passes on no error and exit code 0', () => {
    expect(didCustomFunctionTestPass({ error: null, exitCode: 0 })).toBe(true);
  });

  it('passes on no error and a negative (internal success) exit code', () => {
    expect(didCustomFunctionTestPass({ error: null, exitCode: -2 })).toBe(true);
  });

  it('fails on a positive exit code', () => {
    expect(didCustomFunctionTestPass({ error: null, exitCode: 1 })).toBe(false);
  });

  it('fails when an error is present even with exit code 0', () => {
    expect(didCustomFunctionTestPass({ error: { message: 'nope' }, exitCode: 0 })).toBe(false);
  });
});

describe('runCustomFunctionTest', () => {
  it('sends a base64 payload as a test run and reports a pass', async () => {
    const { client, request } = makeClientStub(PASSING_RESULT);
    const payload = { lead: { score: 42 } };

    const outcome = await runCustomFunctionTest(client, {
      type: 'GENERAL',
      ...JWTS,
      payload,
      sombraId: 'sombra-1',
    });

    expect(outcome.passed).toBe(true);
    expect(outcome.result).toEqual(PASSING_RESULT);

    const variables = request.mock.calls[0]?.[1];
    expect(variables.input).toEqual({
      type: 'GENERAL',
      isCustomFunctionTestRun: true,
      payload: Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64'),
      ...JWTS,
      sombraId: 'sombra-1',
    });
  });

  it('threads payloadType for DSR runs and omits sombraId when not given', async () => {
    const { client, request } = makeClientStub(PASSING_RESULT);

    await runCustomFunctionTest(client, {
      type: 'DSR',
      ...JWTS,
      payload: { type: 'ACCESS' },
      payloadType: 'REQUEST_ENRICHER',
    });

    const variables = request.mock.calls[0]?.[1];
    expect(variables.input.payloadType).toBe('REQUEST_ENRICHER');
    expect(variables.input).not.toHaveProperty('sombraId');
  });

  it('reports a failure with the error and logs', async () => {
    const { client } = makeClientStub(FAILING_RESULT);

    const outcome = await runCustomFunctionTest(client, {
      type: 'GENERAL',
      ...JWTS,
      payload: {},
    });

    expect(outcome.passed).toBe(false);
    expect(outcome.result.error?.message).toBe('Boom');
    expect(outcome.result.logs).toHaveLength(1);
  });

  it('throws a friendly error when the backend does not know the JWT fields', async () => {
    const { client } = makeClientStub(
      new Error(
        'Variable "$input" got invalid value; Field "signedCodeJwt" is not defined ' +
          'by type "RunCustomFunctionInput".',
      ),
    );

    await expect(
      runCustomFunctionTest(client, { type: 'GENERAL', ...JWTS, payload: {} }),
    ).rejects.toThrow(/does not support test-running custom functions from pre-signed JWTs/);
  });

  it('rethrows unrelated errors unchanged', async () => {
    const { client } = makeClientStub(new Error('Client error: something else entirely'));

    await expect(
      runCustomFunctionTest(client, { type: 'GENERAL', ...JWTS, payload: {} }),
    ).rejects.toThrow('Client error: something else entirely');
  });
});
