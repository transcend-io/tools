import type { CustomFunctionPayloadType, CustomFunctionType } from '@transcend-io/privacy-types';
import type { Logger } from '@transcend-io/utils';
import type { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest, NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import { RUN_CUSTOM_FUNCTION } from './gqls/index.js';

/**
 * A log line emitted while executing a custom function.
 */
export interface CustomFunctionExecutionLog {
  /** The logged message */
  message: string;
  /** The stream/file the message was written to (e.g. stdout, stderr) */
  file: string;
}

/**
 * The error a custom function execution failed with, when it failed.
 */
export interface CustomFunctionExecutionError {
  /** Error message */
  message: string;
  /** Stack trace, when available */
  stack?: string | null;
}

/**
 * The result of executing a custom function via the `runCustomFunction`
 * mutation.
 */
export interface CustomFunctionExecutionResult {
  /** Process exit code (negative values are internal "success with warnings" codes) */
  exitCode: number;
  /** The error the execution failed with, when it failed */
  error?: CustomFunctionExecutionError | null;
  /** Log lines emitted during execution */
  logs: CustomFunctionExecutionLog[];
  /** Execution profile */
  profile: {
    /** Wall-clock execution time in milliseconds */
    timeMs: number;
  };
}

/**
 * The outcome of test-running a custom function.
 */
export interface CustomFunctionTestRunResult {
  /** Whether the test passed (no error and a non-failure exit code) */
  passed: boolean;
  /** The raw execution result (error, logs, exit code, timing) */
  result: CustomFunctionExecutionResult;
}

/**
 * A single test payload to run a custom function with before pushing.
 */
export interface CustomFunctionTestPayload {
  /** The JSON test payload */
  payload: object;
  /**
   * Which export the payload invokes for DSR functions (`DATA_POINT` →
   * `default`, `REQUEST_ENRICHER` → `enricher`). Defaults to DATA_POINT.
   * GENERAL functions are always run as Maestro payloads and ignore this
   */
  payloadType?: CustomFunctionPayloadType;
}

/**
 * Whether an execution result counts as a passing test.
 *
 * Mirrors the Admin Dashboard's function editor: a run passes when it
 * produced no error and exited with a code <= 0 (negative codes are internal
 * success-with-metadata codes).
 *
 * @param result - The execution result
 * @returns True when the run passed
 */
export function didCustomFunctionTestPass(
  result: Pick<CustomFunctionExecutionResult, 'error' | 'exitCode'>,
): boolean {
  return !result.error && result.exitCode <= 0;
}

/**
 * Test-run custom function code that has been signed but not yet saved.
 *
 * Sends the pre-signed code/context JWT pair to the `runCustomFunction`
 * mutation as a test run (`isCustomFunctionTestRun: true`). The backend
 * verifies JWT provenance against the target Sombra gateway, executes the
 * code on that gateway, and returns the execution result — nothing is
 * persisted.
 *
 * - GENERAL functions run against `sombraId` (or the organization's primary
 *   Sombra) with the payload validated as a Maestro payload.
 * - DSR functions run against the Sombra of the data silo referenced by
 *   `extras.dataSilo.id` in the payload; `payloadType` selects which export
 *   is invoked (`DATA_POINT` → `default`, `REQUEST_ENRICHER` → `enricher`).
 *
 * Requires backend support for pre-signed JWTs on `runCustomFunction`; older
 * backends reject the JWT fields with a friendly upgrade error.
 *
 * @param client - GraphQL client authenticated with a Transcend API key
 * @param options - Options
 * @returns The execution result plus a `passed` boolean
 */
export async function runCustomFunctionTest(
  client: GraphQLClient,
  options: {
    /** Product-facing type of the custom function under test */
    type: CustomFunctionType;
    /** Pre-signed code JWT from the Sombra customer-ingress `/v1/custom/sign` route */
    signedCodeJwt: string;
    /** Pre-signed code context JWT from the same sign call */
    signedCodeContextJwt: string;
    /** The JSON test payload to invoke the function with (base64-encoded on the wire) */
    payload: object;
    /** Dedicated Sombra gateway ID (GENERAL only; DSR derives it from the payload's data silo) */
    sombraId?: string;
    /**
     * Which export to invoke for DSR functions (`DATA_POINT` → `default`,
     * `REQUEST_ENRICHER` → `enricher`). Defaults to DATA_POINT. GENERAL
     * functions are always run as Maestro payloads and ignore this setting
     */
    payloadType?: CustomFunctionPayloadType;
    /** Logger instance */
    logger?: Logger;
  },
): Promise<CustomFunctionTestRunResult> {
  const {
    type,
    signedCodeJwt,
    signedCodeContextJwt,
    payload,
    sombraId,
    payloadType,
    logger = NOOP_LOGGER,
  } = options;

  let response: {
    /** Mutation response */
    runCustomFunction: {
      /** The execution result */
      result: CustomFunctionExecutionResult;
    };
  };
  try {
    response = await makeGraphQLRequest<typeof response>(client, RUN_CUSTOM_FUNCTION, {
      variables: {
        input: {
          type,
          isCustomFunctionTestRun: true,
          payload: Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64'),
          signedCodeJwt,
          signedCodeContextJwt,
          ...(sombraId !== undefined ? { sombraId } : {}),
          ...(payloadType !== undefined ? { payloadType } : {}),
        },
      },
      logger,
    });
  } catch (err) {
    const message = (err as Error).message ?? '';
    // Older backends don't know the pre-signed JWT fields on RunCustomFunctionInput
    if (
      /signedCodeJwt|signedCodeContextJwt/.test(message) &&
      /is not defined|Unknown argument|got invalid value/i.test(message)
    ) {
      throw new Error(
        'The Transcend backend does not support test-running custom functions from ' +
          'pre-signed JWTs yet. Re-run with tests skipped, or contact Transcend support. ' +
          `Underlying error: ${message}`,
      );
    }
    throw err;
  }

  const { result } = response.runCustomFunction;
  return {
    passed: didCustomFunctionTestPass(result),
    result,
  };
}
