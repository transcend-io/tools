import { Buffer } from 'node:buffer';

import type { TranscendRestClient } from '@transcend-io/mcp-server-base';

import type {
  CustomFunctionExecutionResult,
  CustomFunctionPayloadType,
  CustomFunctionSummary,
  CustomFunctionType,
  CustomFunctionsMixin,
} from '../graphql.js';
import { resolveSombraIdForCreate } from './resolveSombraId.js';

/**
 * Whether an execution result counts as a passing test.
 *
 * Mirrors the Admin Dashboard function editor: a run passes when it produced
 * no error and exited with a code <= 0 (negative codes are internal
 * success-with-metadata codes).
 *
 * Keep in lockstep with packages/sdk/src/custom-functions/runCustomFunctionTest.ts.
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
 * Default GENERAL test payload when the caller omits one.
 */
export const DEFAULT_GENERAL_TEST_PAYLOAD: Record<string, unknown> = {
  message: 'hello world!',
};

/**
 * Minimal DSR webhook-shaped payload. `extras.dataSilo.id` must be replaced
 * with a real silo in the org before GraphQL will execute the run.
 */
export const DEFAULT_DSR_TEST_PAYLOAD: Record<string, unknown> = {
  type: 'ACCESS',
  dataSubject: { type: 'customer' },
  isTest: true,
  extras: {
    request: {
      id: '00000000-0000-0000-0000-000000000001',
      link: 'https://transcend.io/request',
      details: 'custom-function-test',
      createdAt: '2026-01-01T00:00:00.000Z',
      locale: 'en',
      origin: 'PRIVACY_CENTER',
      attributes: [],
    },
    organization: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'test',
      uri: 'test',
    },
    profile: {
      id: '00000000-0000-0000-0000-000000000003',
      RequestDataSiloId: '00000000-0000-0000-0000-000000000004',
      identifier: 'test@example.com',
      type: 'email',
    },
    dataSilo: {
      id: '00000000-0000-0000-0000-000000000005',
      title: 'Custom Function',
      description: 'Custom Function test',
      link: 'https://transcend.io/silo',
    },
  },
};

/**
 * Inject the resolved data silo into a DSR test payload.
 *
 * The unsaved-DSR test path resolves the execution Sombra from
 * `extras.dataSilo.id`. The silo `id` is always overridden; other
 * `extras.dataSilo` fields from the payload are preserved. `title`,
 * `description`, and `link` are defaulted when omitted.
 *
 * Keep in lockstep with packages/sdk/src/custom-functions/injectDataSiloIntoDsrTestPayload.ts.
 *
 * @param payload - The DSR test payload
 * @param dataSilo - The resolved data silo
 * @returns The payload with `extras.dataSilo` pointing at the resolved silo
 */
export function injectDataSiloIntoDsrTestPayload(
  payload: Record<string, unknown>,
  dataSilo: {
    /** Data silo ID */
    id: string;
    /** Fallback title when the payload does not carry one */
    title: string;
  },
): Record<string, unknown> {
  const extras =
    payload.extras && typeof payload.extras === 'object' && !Array.isArray(payload.extras)
      ? (payload.extras as Record<string, unknown>)
      : {};
  const existingDataSilo =
    extras.dataSilo && typeof extras.dataSilo === 'object' && !Array.isArray(extras.dataSilo)
      ? (extras.dataSilo as Record<string, unknown>)
      : {};
  return {
    ...payload,
    extras: {
      ...extras,
      dataSilo: {
        title: dataSilo.title,
        description: '',
        link: '',
        ...existingDataSilo,
        id: dataSilo.id,
      },
    },
  };
}

/**
 * Slim test-run fields returned to MCP callers. Omits executor spawn args
 * and host paths from the GraphQL profile.
 */
export interface CustomFunctionTestRunView {
  /** Whether the run passed (no error and exitCode <= 0) */
  passed: boolean;
  /** Process exit code */
  exitCode: number;
  /** Console output captured during execution */
  logs: CustomFunctionExecutionResult['logs'];
  /** Customer execution error, when execution failed */
  error?: CustomFunctionExecutionResult['error'];
  /** Wall-clock execution time in milliseconds */
  timeMs: number;
}

/**
 * Map a GraphQL execution result to the public test-run view.
 *
 * @param result - Raw execution result
 * @returns Slim test-run view
 */
export function mapCustomFunctionTestRunView(
  result: CustomFunctionExecutionResult,
): CustomFunctionTestRunView {
  return {
    passed: didCustomFunctionTestPass(result),
    exitCode: result.exitCode,
    logs: result.logs,
    error: result.error,
    timeMs: result.profile.timeMs,
  };
}

function isEmptyPayload(payload: Record<string, unknown> | undefined): boolean {
  return payload === undefined || Object.keys(payload).length === 0;
}

/**
 * Rewrite GraphQL test-run errors into the retry instructions the tool
 * schemas advertise.
 *
 * @param error - The thrown GraphQL or validation error
 * @returns A mapped Error when the message matches a known smoke failure
 */
export function mapCustomFunctionTestRunError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  if (
    /signedCodeJwt|signedCodeContextJwt/.test(message) &&
    /input\.id|when `input\.id` is set/i.test(message)
  ) {
    return new Error(
      'Stored test runs must omit trial code. Retry custom_functions_test_run ' +
        'with only { id }. If you meant to trial unsaved edits, omit id. DSR unsaved ' +
        'trials also need dataSiloId from upsert.',
    );
  }
  return error instanceof Error ? error : new Error(message);
}

function throwMappedTestRunError(error: unknown): never {
  throw mapCustomFunctionTestRunError(error);
}

function readDataSiloIdFromPayload(payload: Record<string, unknown>): string | undefined {
  const extras = payload.extras;
  if (!extras || typeof extras !== 'object' || Array.isArray(extras) || !('dataSilo' in extras)) {
    return undefined;
  }
  const dataSilo = extras.dataSilo;
  if (!dataSilo || typeof dataSilo !== 'object' || Array.isArray(dataSilo) || !('id' in dataSilo)) {
    return undefined;
  }
  return typeof dataSilo.id === 'string' && dataSilo.id.length > 0 ? dataSilo.id : undefined;
}

/**
 * Sign or reuse JWTs, inject DSR silo metadata, and execute a test run.
 * Matches the admin dashboard: tests execute against a code source; the
 * tested badge is persisted on save. A passing id-only run can set
 * successfulTestRun only when the readable version is still a draft.
 *
 * @param graphql - Custom Functions GraphQL mixin
 * @param rest - Sombra REST client
 * @param input - Test-run parameters
 * @returns Slim result plus optional updated function summary
 */
export async function executeCustomFunctionTestRun(
  graphql: CustomFunctionsMixin,
  rest: TranscendRestClient,
  input: {
    /** Product-facing type; inferred from the stored function when id is set */
    type?: CustomFunctionType;
    /** Stored custom function ID; binds the run and can mark the version tested */
    id?: string;
    /** Plaintext to sign when not using stored or pre-signed JWTs */
    code?: string;
    /** Pre-signed JWT pair from the caller (upsert) */
    signed?: {
      /** Signed code JWT */
      signedCodeJwt: string;
      /** Signed context JWT */
      signedCodeContextJwt: string;
    };
    /** JSON test payload; defaults by type when omitted */
    payload?: Record<string, unknown>;
    /** DSR payload subtype */
    payloadType?: CustomFunctionPayloadType;
    /** GENERAL gateway ID */
    sombraId?: string;
    /** DSR silo ID to inject when the payload omits one */
    dataSiloId?: string;
    /** Environment variables encrypted into freshly signed context */
    userDefinedEnv?: Record<string, string>;
    /** Network hosts the function is allowed to contact */
    allowedHosts?: string[];
    /** Allow imports from Sombra-approved third-party repositories */
    allowThirdPartyImports?: boolean;
    /** Maximum function runtime in milliseconds */
    timeoutMs?: number;
    /** Persist successfulTestRun on a stored draft after a passing id-only run */
    markSuccessfulTestRun?: boolean;
  },
): Promise<{
  /** Slim execution view */
  result: CustomFunctionTestRunView;
  /** Stored function after an optional successfulTestRun update */
  customFunction?: CustomFunctionSummary;
}> {
  const stored = input.id ? await graphql.getSignedCustomFunctionVersion(input.id) : undefined;
  const type = input.type ?? stored?.customFunction.type;
  if (!type) {
    throw new Error(
      'Pass type when testing unsaved code, or id to infer type from the stored Custom Function.',
    );
  }
  if (stored && input.type && stored.customFunction.type !== input.type) {
    throw new Error(
      `Custom function ${input.id} is type ${stored.customFunction.type}, not ${input.type}.`,
    );
  }
  if (type === 'GENERAL' && input.payloadType) {
    throw new Error('payloadType is only valid for DSR test runs. Omit payloadType for GENERAL.');
  }

  const ranStoredVersion = Boolean(input.id) && !input.code && !input.signed;
  // DSR GraphQL can execute a saved row by id (binds Activity). GENERAL has no
  // stored-id path — the dashboard tests GENERAL with a code source, so we
  // replay the stored JWT pair and omit id.
  const boundStoredDsrRun = ranStoredVersion && type === 'DSR';
  let signed = input.signed;
  if (!signed && input.code) {
    signed = await rest.signCustomFunction({
      code: input.code,
      context: {
        userDefinedEnv: input.userDefinedEnv ?? {},
        allowedHosts: input.allowedHosts ?? [],
        allowThirdPartyImports: input.allowThirdPartyImports,
        timeoutMs: input.timeoutMs,
      },
    });
  }
  if (!signed && stored) {
    signed = {
      signedCodeJwt: stored.signedCodeJwt,
      signedCodeContextJwt: stored.signedCodeContextJwt,
    };
  }
  if (!ranStoredVersion && !signed) {
    throw new Error('Provide code to test, or id to test a stored Custom Function version.');
  }

  let payload = isEmptyPayload(input.payload)
    ? type === 'DSR'
      ? { ...DEFAULT_DSR_TEST_PAYLOAD }
      : { ...DEFAULT_GENERAL_TEST_PAYLOAD }
    : { ...input.payload! };

  if (type === 'DSR') {
    const siloId =
      input.dataSiloId ??
      stored?.customFunction.dataSiloId ??
      readDataSiloIdFromPayload(input.payload ?? {});
    if (!siloId) {
      throw new Error('Pass dataSiloId from the upsert response (or id of the stored function).');
    }
    payload = injectDataSiloIntoDsrTestPayload(payload, {
      id: siloId,
      title: stored?.customFunction.name ?? 'Custom Function',
    });
  }

  const resolvedSombraId =
    type === 'GENERAL'
      ? await resolveSombraIdForCreate(
          () => graphql.listSombras(),
          rest,
          input.sombraId ?? stored?.customFunction.sombraId,
        )
      : undefined;

  let execution;
  try {
    execution = await graphql.testRunCustomFunction({
      type,
      ...(boundStoredDsrRun && input.id !== undefined ? { id: input.id } : {}),
      sombraId: resolvedSombraId,
      payload: Buffer.from(JSON.stringify(payload), 'utf8').toString('base64'),
      payloadType: type === 'DSR' ? input.payloadType : undefined,
      ...(boundStoredDsrRun || !signed ? {} : signed),
    });
  } catch (error) {
    throwMappedTestRunError(error);
  }
  const result = mapCustomFunctionTestRunView(execution);

  let customFunction = stored?.customFunction;
  if (
    result.passed &&
    input.markSuccessfulTestRun &&
    ranStoredVersion &&
    stored &&
    stored.version.lifecycleState === 'DRAFT' &&
    signed
  ) {
    try {
      customFunction = await graphql.updateCustomFunction({
        id: stored.customFunction.id,
        versionId: stored.version.id,
        successfulTestRun: true,
        ...signed,
      });
    } catch (error) {
      throwMappedTestRunError(error);
    }
  }

  return { result, customFunction };
}
