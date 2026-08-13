import { CustomFunctionType } from '@transcend-io/privacy-types';
import type { Logger } from '@transcend-io/utils';
import type { Got } from 'got';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest, NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import { buildCustomFunctionSignPayload } from './buildCustomFunctionSignPayload.js';
import { diffCustomFunctionCode } from './codeSigning.js';
import { createCustomFunctionDataSilo, deleteDataSilo } from './customFunctionDataSilo.js';
import type { CustomFunction } from './fetchAllCustomFunctions.js';
import {
  CREATE_CUSTOM_FUNCTION,
  PROMOTE_CUSTOM_FUNCTION_VERSION,
  UPDATE_STANDALONE_CUSTOM_FUNCTION,
} from './gqls/index.js';
import { injectDataSiloIntoDsrTestPayload } from './injectDataSiloIntoDsrTestPayload.js';
import { resolveEffectiveSombraId, resolvePrimarySombraId } from './resolveEffectiveSombraId.js';
import { resolveExistingCustomFunction } from './resolveExistingCustomFunction.js';
import {
  runCustomFunctionTest,
  type CustomFunctionTestPayload,
  type CustomFunctionTestRunResult,
} from './runCustomFunctionTest.js';
import { signCustomFunctionCode } from './signCustomFunctionCode.js';

/**
 * The desired state of a custom function to sync to Transcend.
 */
export interface CustomFunctionConfigInput {
  /**
   * Custom function ID to update. When set, this is the sync key and the
   * function must already exist. When omitted, the function is matched by
   * exact name — which fails if multiple functions share the name.
   */
  id?: string;
  /** Display name of the custom function (the sync key when no `id` is set) */
  name: string;
  /** The plaintext TypeScript source code */
  code: string;
  /** Description of the custom function */
  description?: string;
  /** Product-facing type. Defaults to GENERAL */
  type?: CustomFunctionType;
  /** Data silo ID the function is attached to (required for DSR functions) */
  dataSiloId?: string;
  /** Dedicated Sombra gateway ID (defaults to the organization's primary Sombra) */
  sombraId?: string;
  /** Hosts the function is allowed to make network requests to */
  allowedHosts?: string[];
  /** Whether the function may import third party modules */
  allowThirdPartyImports?: boolean;
  /** Execution timeout in milliseconds */
  timeoutMs?: number;
  /** Environment variables to expose to the function */
  env?: Record<string, string>;
}

/**
 * The outcome of syncing a single custom function.
 */
export type CustomFunctionSyncOutcome =
  /** A new custom function was created */
  | 'created'
  /** A new revision was pushed to an existing custom function */
  | 'updated'
  /** No changes detected; nothing was pushed */
  | 'skipped'
  /** The test run failed; nothing was pushed */
  | 'test-failed'
  /** Dry run: a new custom function would be created */
  | 'would-create'
  /** Dry run: a new revision would be pushed */
  | 'would-update';

/**
 * The result of running one test payload during a sync, tagged with the
 * export the payload invoked.
 */
export interface CustomFunctionSyncTestResult extends CustomFunctionTestRunResult {
  /** Which export the payload invoked (DSR functions; DATA_POINT when omitted) */
  payloadType?: CustomFunctionTestPayload['payloadType'];
}

/**
 * The result of syncing a single custom function.
 */
export interface CustomFunctionSyncResult {
  /** The sync outcome */
  outcome: CustomFunctionSyncOutcome;
  /** The custom function ID (when it exists or was created) */
  customFunctionId?: string;
  /** The version number that is now active or drafted (when a revision was pushed) */
  versionNumber?: string;
  /** Fields that changed, driving the update (empty on create/skip) */
  changedFields: string[];
  /** Whether the pushed revision was promoted to active */
  promoted: boolean;
  /** The test-run results (one per payload), when the code was tested */
  testResults?: CustomFunctionSyncTestResult[];
  /** The data silo (DSR integration) the function is linked to, for DSR functions */
  dataSiloId?: string;
  /**
   * Whether a new data silo (DSR integration) was created during this sync.
   * On a `test-failed` outcome this means the auto-created silo was rolled
   * back (deleted) — `dataSiloId` is absent in that case.
   */
  createdDataSilo?: boolean;
}

/**
 * Sync a custom function definition (metadata + code revision) to Transcend.
 *
 * - When no custom function with the given name exists, one is created.
 * - A new DSR function without a `dataSiloId` also gets its DSR integration
 *   created: a `customFunction`-catalog data silo shell is created first (the
 *   backend needs it to exist for the test run), the code is tested against
 *   it, and on a passing test the function is created and linked. A failing
 *   test rolls the silo back (deletes it).
 * - When one exists and the code/context changed, a new draft revision is
 *   created and (unless `promote` is false) promoted to active.
 * - When nothing changed, the function is skipped (unless `force` is set).
 *
 * Code is signed against the Sombra customer-ingress `/v1/custom/sign` route
 * before being saved via the GraphQL API, so plaintext code and env values
 * never reach Transcend's backend.
 *
 * Environment variable values are encrypted server-side and cannot be diffed;
 * use `force` to re-push when only env values changed.
 *
 * @param client - GraphQL client authenticated with a Transcend API key
 * @param options - Options
 * @returns The sync result
 */
export async function syncCustomFunction(
  client: GraphQLClient,
  options: {
    /** The desired custom function state */
    input: CustomFunctionConfigInput;
    /**
     * Got instance authenticated against the customer ingress of the Sombra
     * gateway the function belongs to (see `resolveEffectiveSombraId`).
     * Required unless `dryRun` is set
     */
    sombra?: Got;
    /** Default Sombra gateway ID when neither the config nor the existing function specify one */
    defaultSombraId?: string;
    /** All existing custom functions in the organization (see `fetchAllCustomFunctions`) */
    existing: CustomFunction[];
    /** Whether to promote new revisions to active. Defaults to true */
    promote?: boolean;
    /** When true, report what would happen without mutating anything */
    dryRun?: boolean;
    /** When true, push a new revision even if no changes were detected */
    force?: boolean;
    /**
     * JSON test payloads to run the freshly signed code with before pushing.
     * Every payload is run via the `runCustomFunction` mutation (DSR
     * functions can cover both the default and enricher exports via
     * `payloadType`) and all must pass — any failure rejects the push
     * (outcome `test-failed`). Skipped on dry runs (nothing is signed).
     */
    testPayloads?: CustomFunctionTestPayload[];
    /** Logger instance */
    logger?: Logger;
  },
): Promise<CustomFunctionSyncResult> {
  const {
    input,
    sombra,
    defaultSombraId,
    existing: allExisting,
    promote = true,
    dryRun = false,
    force = false,
    testPayloads,
    logger = NOOP_LOGGER,
  } = options;
  const type: CustomFunctionType = input.type ?? CustomFunctionType.General;

  const existing = resolveExistingCustomFunction(allExisting, input);
  // Validates config-vs-existing gateway mismatches, including on dry runs
  const effectiveSombraId = resolveEffectiveSombraId(input, existing, defaultSombraId);
  const signPayload = buildCustomFunctionSignPayload(input);

  // Diff against the existing preferred (draft if pending, else active) version
  let changedFields: string[] = [];
  if (existing) {
    const diff = diffCustomFunctionCode(signPayload, {
      signedCodeJwt: existing.signedCodeJwt,
      signedCodeContextJwt: existing.signedCodeContextJwt,
    });
    changedFields = diff.changedFields;
    if (!diff.changed && !force) {
      logger.info(`No changes detected for custom function "${input.name}" — skipping.`);
      return {
        outcome: 'skipped',
        customFunctionId: existing.id,
        changedFields: [],
        promoted: false,
        ...(existing.dataSiloId ? { dataSiloId: existing.dataSiloId } : {}),
      };
    }
  }

  if (dryRun) {
    return {
      outcome: existing ? 'would-update' : 'would-create',
      ...(existing ? { customFunctionId: existing.id } : {}),
      changedFields,
      promoted: false,
    };
  }

  if (!sombra) {
    throw new Error('A Sombra customer-ingress client is required to push custom function code.');
  }

  // Sign the code and context against the Sombra gateway; the resulting JWTs
  // are stored via the GraphQL API
  const { signedCodeJwt, signedCodeContextJwt } = await signCustomFunctionCode(
    sombra,
    signPayload,
    { customFunctionId: existing?.id },
  );

  // Resolve the data silo (DSR integration) backing a DSR function: the
  // config's, else the existing function's. A brand-new DSR function without
  // one gets its integration created here — an inert `customFunction`-catalog
  // shell that stays NOT_CONFIGURED until the function is linked to it. It
  // must exist before the test run, because the backend resolves the
  // execution Sombra from the payload's `extras.dataSilo.id`.
  let dataSiloId = input.dataSiloId ?? existing?.dataSiloId ?? undefined;
  let createdDataSilo = false;
  if (type === CustomFunctionType.Dsr && !existing && dataSiloId === undefined) {
    const siloSombraId = effectiveSombraId ?? (await resolvePrimarySombraId(client, logger));
    logger.info(`Creating DSR integration (data silo) for custom function "${input.name}"...`);
    const dataSilo = await createCustomFunctionDataSilo(client, {
      title: input.name,
      sombraId: siloSombraId,
      logger,
    });
    dataSiloId = dataSilo.id;
    createdDataSilo = true;
  }

  // Test the freshly signed code before pushing anything. Every payload runs
  // (so one CI run reports every failing export) and all must pass — any
  // failure rejects the push so a broken revision never reaches (or is
  // promoted on) the function.
  let testResults: CustomFunctionSyncTestResult[] | undefined;
  if (testPayloads !== undefined && testPayloads.length > 0) {
    logger.info(
      `Testing custom function "${input.name}" before push ` +
        `(${testPayloads.length} payload${testPayloads.length === 1 ? '' : 's'})...`,
    );
    testResults = [];
    for (const { payload, payloadType } of testPayloads) {
      const run: CustomFunctionTestRunResult = await runCustomFunctionTest(client, {
        type,
        signedCodeJwt,
        signedCodeContextJwt,
        // DSR payloads must reference the function's actual data silo — the
        // backend derives the execution gateway from `extras.dataSilo.id`
        payload:
          type === CustomFunctionType.Dsr && dataSiloId !== undefined
            ? injectDataSiloIntoDsrTestPayload(payload, {
                id: dataSiloId,
                title: input.name,
              })
            : payload,
        // GENERAL runs on the function's gateway
        ...(type === CustomFunctionType.General && effectiveSombraId !== undefined
          ? { sombraId: effectiveSombraId }
          : {}),
        ...(type === CustomFunctionType.Dsr && payloadType !== undefined ? { payloadType } : {}),
        logger,
      });
      testResults.push({ ...run, ...(payloadType !== undefined ? { payloadType } : {}) });
    }
    if (testResults.some(({ passed }) => !passed)) {
      // Roll back the integration created for this function — nothing was
      // linked to it yet, so a failed test leaves no trace behind
      if (createdDataSilo && dataSiloId !== undefined) {
        logger.info(
          `Rolling back DSR integration (data silo ${dataSiloId}) for "${input.name}" — test failed.`,
        );
        await deleteDataSilo(client, dataSiloId, { logger });
        dataSiloId = undefined;
      }
      return {
        outcome: 'test-failed',
        ...(existing ? { customFunctionId: existing.id } : {}),
        changedFields,
        promoted: false,
        testResults,
        ...(createdDataSilo ? { createdDataSilo } : {}),
      };
    }
  }

  // Create fresh
  if (!existing) {
    // The backend requires an explicit gateway for GENERAL functions (and
    // rejects one for DSR functions, whose data silo dictates the gateway)
    const createSombraId =
      type === CustomFunctionType.General
        ? (effectiveSombraId ?? (await resolvePrimarySombraId(client, logger)))
        : undefined;
    // DSR functions are always created active — the backend rejects setActive
    if (type === CustomFunctionType.Dsr && !promote) {
      logger.warn(
        `DSR custom functions are always created active — "${input.name}" ` +
          'will be created promoted despite promote being disabled.',
      );
    }
    const {
      createCustomFunction: { customFunction },
    } = await makeGraphQLRequest<{
      /** Mutation response */
      createCustomFunction: {
        /** The created custom function */
        customFunction: {
          /** Custom function ID */
          id: string;
          /** Active version, when created active */
          activeVersion?: {
            /** Version ID */
            id: string;
            /** Version number */
            versionNumber: string;
          } | null;
          /** Draft version, when created inactive */
          draftVersion?: {
            /** Version ID */
            id: string;
            /** Version number */
            versionNumber: string;
          } | null;
        };
      };
    }>(client, CREATE_CUSTOM_FUNCTION, {
      variables: {
        input: {
          type,
          ...(createSombraId !== undefined ? { sombraId: createSombraId } : {}),
          ...(type === CustomFunctionType.Dsr ? { dataSiloId } : {}),
          name: input.name,
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(type === CustomFunctionType.General ? { setActive: promote } : {}),
          signedCodeJwt,
          signedCodeContextJwt,
        },
      },
      logger,
    });
    const version = customFunction.activeVersion ?? customFunction.draftVersion;
    return {
      outcome: 'created',
      customFunctionId: customFunction.id,
      ...(version ? { versionNumber: version.versionNumber } : {}),
      changedFields,
      promoted: type === CustomFunctionType.Dsr ? true : promote,
      ...(testResults ? { testResults } : {}),
      ...(dataSiloId !== undefined ? { dataSiloId } : {}),
      ...(createdDataSilo ? { createdDataSilo } : {}),
    };
  }

  // Push a new draft revision to the existing function
  const {
    updateStandaloneCustomFunction: { customFunction: updated },
  } = await makeGraphQLRequest<{
    /** Mutation response */
    updateStandaloneCustomFunction: {
      /** The updated custom function */
      customFunction: {
        /** Custom function ID */
        id: string;
        /** The new draft version */
        draftVersion?: {
          /** Version ID */
          id: string;
          /** Version number */
          versionNumber: string;
        } | null;
      };
    };
  }>(client, UPDATE_STANDALONE_CUSTOM_FUNCTION, {
    variables: {
      input: {
        id: existing.id,
        name: input.name,
        ...(input.description !== undefined ? { description: input.description } : {}),
        signedCodeJwt,
        signedCodeContextJwt,
      },
    },
    logger,
  });

  const draft = updated.draftVersion;
  if (!draft) {
    throw new Error(
      `Expected a draft version to be created for custom function "${input.name}" but none was returned.`,
    );
  }

  if (promote) {
    await makeGraphQLRequest(client, PROMOTE_CUSTOM_FUNCTION_VERSION, {
      variables: {
        input: {
          customFunctionId: updated.id,
          versionId: draft.id,
        },
      },
      logger,
    });
  }

  return {
    outcome: 'updated',
    customFunctionId: updated.id,
    versionNumber: draft.versionNumber,
    changedFields,
    promoted: promote,
    ...(testResults ? { testResults } : {}),
    ...(dataSiloId !== undefined ? { dataSiloId } : {}),
  };
}
