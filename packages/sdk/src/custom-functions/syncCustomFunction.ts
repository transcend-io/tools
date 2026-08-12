import type { Logger } from '@transcend-io/utils';
import type { Got } from 'got';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest, NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import { diffCustomFunctionCode, type CustomFunctionSignPayload } from './codeSigning.js';
import { createCustomFunctionDataSilo, deleteDataSilo } from './customFunctionDataSilo.js';
import type { CustomFunction, CustomFunctionType } from './fetchAllCustomFunctions.js';
import {
  CREATE_CUSTOM_FUNCTION,
  ORGANIZATION_SOMBRAS,
  PROMOTE_CUSTOM_FUNCTION_VERSION,
  UPDATE_STANDALONE_CUSTOM_FUNCTION,
} from './gqls/index.js';
import {
  runCustomFunctionTest,
  type CustomFunctionTestPayloadType,
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
  /** The test-run result, when a test payload was provided and the code was tested */
  testResult?: CustomFunctionTestRunResult;
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
 * Resolve which existing custom function a config refers to.
 *
 * When the config has an `id`, it must match an existing function. Otherwise
 * the function is matched by exact name; an ambiguous name (multiple existing
 * functions with the same name) is an error that the caller should resolve by
 * adding an `id` to the config.
 *
 * @param existing - All existing custom functions in the organization
 * @param input - The custom function config
 * @returns The matching custom function, or undefined when it should be created
 */
export function resolveExistingCustomFunction(
  existing: CustomFunction[],
  input: Pick<CustomFunctionConfigInput, 'id' | 'name'>,
): CustomFunction | undefined {
  if (input.id) {
    const match = existing.find(({ id }) => id === input.id);
    if (!match) {
      throw new Error(
        `Custom function "${input.name}" specifies id "${input.id}" but no custom function ` +
          'with that ID exists in the organization. Remove the id to create a new function, ' +
          'or fix the ID.',
      );
    }
    return match;
  }

  const matches = existing.filter(({ name }) => name === input.name);
  if (matches.length > 1) {
    throw new Error(
      `Multiple custom functions are named "${input.name}" ` +
        `(ids: ${matches.map(({ id }) => id).join(', ')}). ` +
        'Add an `id` field to this manifest entry to disambiguate which one to update.',
    );
  }
  return matches[0];
}

/**
 * Resolve which Sombra gateway a custom function's code must be signed
 * against.
 *
 * Each custom function belongs to a single gateway, whose keys sign the code
 * and encrypt the env values — signing against any other gateway would
 * produce JWTs that fail verification at execution time. The gateway is
 * resolved as: the config's `sombraId`, else the existing function's
 * gateway, else the caller's default (e.g. a CLI flag), else `undefined`
 * meaning the organization's primary Sombra.
 *
 * A config that pins a different gateway than the existing function is an
 * error — the gateway of an existing function cannot be changed by a push.
 *
 * @param input - The custom function config
 * @param existing - The matching existing custom function, when there is one
 * @param defaultSombraId - Fallback gateway ID when neither the config nor the existing function specify one
 * @returns The Sombra gateway ID to sign against, or undefined for the primary gateway
 */
export function resolveEffectiveSombraId(
  input: Pick<CustomFunctionConfigInput, 'name' | 'sombraId'>,
  existing: Pick<CustomFunction, 'id' | 'sombraId'> | undefined,
  defaultSombraId?: string,
): string | undefined {
  if (input.sombraId && existing?.sombraId && input.sombraId !== existing.sombraId) {
    throw new Error(
      `Custom function "${input.name}" specifies sombra-id "${input.sombraId}" but the ` +
        `existing function (id: ${existing.id}) belongs to Sombra gateway "${existing.sombraId}". ` +
        'A push cannot move a custom function between gateways — fix the sombra-id in the ' +
        'manifest, or remove it to keep the existing gateway.',
    );
  }
  return input.sombraId ?? existing?.sombraId ?? defaultSombraId;
}

/**
 * Build the sign payload for a custom function config.
 *
 * @param input - The custom function config
 * @returns The plaintext sign payload
 */
export function buildCustomFunctionSignPayload(
  input: CustomFunctionConfigInput,
): CustomFunctionSignPayload {
  return {
    code: input.code,
    context: {
      userDefinedEnv: input.env ?? {},
      allowedHosts: input.allowedHosts ?? [],
      ...(input.allowThirdPartyImports !== undefined
        ? { allowThirdPartyImports: input.allowThirdPartyImports }
        : {}),
      ...(input.timeoutMs !== undefined ? { timeoutMs: input.timeoutMs } : {}),
    },
  };
}

/**
 * Inject the resolved data silo into a DSR test payload.
 *
 * The backend's unsaved-DSR test path resolves the execution Sombra from
 * `extras.dataSilo.id`, so the payload must reference the function's actual
 * data silo — which the payload file cannot know for silos created during
 * the same push. The silo `id` is always overridden; other `extras.dataSilo`
 * fields from the payload file are preserved, with `title` defaulted when
 * missing.
 *
 * @param payload - The DSR test payload from the manifest
 * @param dataSilo - The resolved data silo
 * @returns The payload with `extras.dataSilo` pointing at the resolved silo
 */
export function injectDataSiloIntoDsrTestPayload(
  payload: object,
  dataSilo: {
    /** Data silo ID */
    id: string;
    /** Fallback title when the payload does not carry one */
    title: string;
  },
): object {
  const record = payload as {
    /** DSR payload extras */
    extras?: Record<string, unknown>;
  };
  const extras = record.extras ?? {};
  const existingDataSilo = (extras['dataSilo'] ?? {}) as Record<string, unknown>;
  return {
    ...record,
    extras: {
      ...extras,
      dataSilo: {
        title: dataSilo.title,
        ...existingDataSilo,
        id: dataSilo.id,
      },
    },
  };
}

/**
 * Resolve the organization's primary Sombra gateway ID.
 *
 * @param client - GraphQL client authenticated with a Transcend API key
 * @param logger - Logger instance
 * @returns The primary Sombra ID
 */
async function resolvePrimarySombraId(client: GraphQLClient, logger: Logger): Promise<string> {
  const { organization } = await makeGraphQLRequest<{
    /** Organization query response */
    organization: {
      /** Primary Sombra gateway */
      sombra: {
        /** Sombra ID */
        id: string;
      } | null;
    };
  }>(client, ORGANIZATION_SOMBRAS, { logger });
  if (!organization.sombra?.id) {
    throw new Error(
      'Could not resolve the primary Sombra gateway of the organization, which is ' +
        'required to create a DSR custom function integration. Specify a sombra-id ' +
        'on the manifest entry instead.',
    );
  }
  return organization.sombra.id;
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
     * JSON test payload to run the freshly signed code with before pushing.
     * When set, the code is tested via the `runCustomFunction` mutation and
     * the push is rejected (outcome `test-failed`) if the test fails.
     * Skipped on dry runs (nothing is signed).
     */
    testPayload?: object;
    /** Which export to invoke for DSR test runs. Defaults to DATA_POINT */
    testPayloadType?: CustomFunctionTestPayloadType;
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
    testPayload,
    testPayloadType,
    logger = NOOP_LOGGER,
  } = options;
  const type: CustomFunctionType = input.type ?? 'GENERAL';

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
  if (type === 'DSR' && !existing && dataSiloId === undefined) {
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

  // Test the freshly signed code before pushing anything. A failing test
  // rejects the push so a broken revision never reaches (or is promoted on)
  // the function.
  let testResult: CustomFunctionTestRunResult | undefined;
  if (testPayload !== undefined) {
    logger.info(`Testing custom function "${input.name}" before push...`);
    testResult = await runCustomFunctionTest(client, {
      type,
      signedCodeJwt,
      signedCodeContextJwt,
      // DSR payloads must reference the function's actual data silo — the
      // backend derives the execution gateway from `extras.dataSilo.id`
      payload:
        type === 'DSR' && dataSiloId !== undefined
          ? injectDataSiloIntoDsrTestPayload(testPayload, {
              id: dataSiloId,
              title: input.name,
            })
          : testPayload,
      // GENERAL runs on the function's gateway
      ...(type === 'GENERAL' && effectiveSombraId !== undefined
        ? { sombraId: effectiveSombraId }
        : {}),
      ...(type === 'DSR' && testPayloadType !== undefined ? { payloadType: testPayloadType } : {}),
      logger,
    });
    if (!testResult.passed) {
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
        testResult,
        ...(createdDataSilo ? { createdDataSilo } : {}),
      };
    }
  }

  // Create fresh
  if (!existing) {
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
          ...(effectiveSombraId !== undefined ? { sombraId: effectiveSombraId } : {}),
          ...(type === 'DSR' ? { dataSiloId } : {}),
          name: input.name,
          ...(input.description !== undefined ? { description: input.description } : {}),
          setActive: promote,
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
      promoted: promote,
      ...(testResult ? { testResult } : {}),
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
    ...(testResult ? { testResult } : {}),
    ...(dataSiloId !== undefined ? { dataSiloId } : {}),
  };
}
