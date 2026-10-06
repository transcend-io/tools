import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import { CustomFunctionPayloadType, CustomFunctionType } from '@transcend-io/privacy-types';

import type { CustomFunctionsMixin } from '../graphql.js';
import {
  applyEnvVarNames,
  applyEnvironmentVariablesInput,
  buildCustomFunctionSignContext,
  type CustomFunctionEnvEntry,
  envEntriesFromUnwrappedContext,
  sombraSupportsCustomFunctionSplitEnv,
} from '../helpers/buildCustomFunctionSignContext.js';
import {
  executeCustomFunctionTestRun,
  PAYLOAD_OMIT_GUIDANCE,
  type CustomFunctionTestRunView,
} from '../helpers/customFunctionTestRun.js';
import {
  decodeStoredContextJwt,
  envKeyNamesFromStoredContext,
} from '../helpers/decodeStoredContextJwt.js';
import { mapCustomFunctionUpsertError } from '../helpers/mapUpsertError.js';
import { customFunctionDashboardHint, customFunctionNextStep } from '../helpers/nextStep.js';
import { resolveSombraIdForCreate } from '../helpers/resolveSombraId.js';

const TestPayloadSchema = z.object({
  payload: z.record(z.string(), z.unknown()).optional().describe(PAYLOAD_OMIT_GUIDANCE),
  payloadType: z
    .enum([CustomFunctionPayloadType.DataPoint, CustomFunctionPayloadType.RequestEnricher])
    .optional()
    .describe('DSR only; defaults to DATA_POINT. Omit for GENERAL'),
});

export const CustomFunctionsUpsertSchema = z
  .object({
    id: z.string().optional().describe('ID to update; omit to create'),
    versionId: z.string().optional().describe('Draft version ID to update; requires id'),
    type: z.nativeEnum(CustomFunctionType).describe('DSR or GENERAL'),
    dataSiloId: z
      .string()
      .optional()
      .describe(
        'Existing CUSTOM_FUNCTION silo that is still NOT_CONFIGURED (one DSR function per silo). ' +
          'Prefer omitting to auto-create one.',
      ),
    sombraId: z
      .string()
      .optional()
      .describe('Gateway ID; omit unless an error lists options. Never on DSR create'),
    name: z.string().optional().describe('Required on create; keep unique for list search'),
    description: z.string().optional().describe('Behavior description'),
    code: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Plaintext TypeScript (GENERAL: default export; DSR: default + enricher). Required on ' +
          'create; on update omit to keep stored code (metadata-only env/hosts/timeout changes).',
      ),
    envVarNames: z
      .array(z.string().min(1))
      .optional()
      .describe(
        'Environment variable names the code reads (e.g. API_KEY). Creates placeholders; the user ' +
          'enters real values in the dashboard. Never pass secret values. On update, adds missing ' +
          'names and keeps existing values; omit to leave env unchanged. Prefer environmentVariables ' +
          'when you need an explicit secret vs plain classification.',
      ),
    environmentVariables: z
      .array(
        z.object({
          key: z.string().min(1).describe('Variable name'),
          value: z
            .string()
            .optional()
            .describe(
              'Plaintext value. Never pass secrets. Omit on update to keep the stored value.',
            ),
          isSecret: z
            .boolean()
            .describe(
              'When true, encrypt at sign time (dashboard “Secure”). When false, store as plaintext.',
            ),
          replaceSecret: z
            .boolean()
            .optional()
            .describe(
              'On update, set true when supplying a new secret value to replace the stored ciphertext.',
            ),
        }),
      )
      .optional()
      .describe(
        'Classified environment variables. Use instead of envVarNames when secret vs plain text ' +
          'matters. Never pass secret values — users set secrets in the dashboard.',
      ),
    allowedHosts: z
      .array(z.string())
      .optional()
      .describe(
        'Outbound hostname allowlist, no scheme (e.g. pokeapi.co). A provided list replaces the ' +
          "saved one. [] means localhost only; any non-empty list drops localhost (add 'localhost' " +
          'for sdk.fetch). On update, omit to keep the saved list.',
      ),
    allowThirdPartyImports: z.boolean().optional().describe('Allow third-party imports'),
    timeoutMs: z.number().int().positive().optional().describe('Timeout ms'),
    setActive: z
      .boolean()
      .optional()
      .default(false)
      .describe('Activate GENERAL on create; ignored for DSR/updates'),
    promote: z
      .boolean()
      .optional()
      .default(false)
      .describe('After update, promote the draft to active. Default false'),
    testPayloads: z
      .array(TestPayloadSchema)
      .optional()
      .describe(
        'Optional pre-save tests; sets successfulTestRun only if all pass. Never blocks save.',
      ),
  })
  .superRefine((input, context) => {
    if (!input.id && !input.name) {
      context.addIssue({
        code: 'custom',
        path: ['name'],
        message:
          'Pass a unique name when creating a Custom Function so custom_functions_list text ' +
          'search can find it',
      });
    }
    if (!input.id && !input.code) {
      context.addIssue({
        code: 'custom',
        path: ['code'],
        message: 'Pass plaintext TypeScript code when creating a Custom Function',
      });
    }
    if (input.versionId && !input.id) {
      context.addIssue({
        code: 'custom',
        path: ['versionId'],
        message: 'versionId is only valid when updating an existing custom function',
      });
    }
    if (input.promote && !input.id) {
      context.addIssue({
        code: 'custom',
        path: ['promote'],
        message: 'promote is only valid when updating an existing custom function',
      });
    }
  });
export type CustomFunctionsUpsertInput = z.infer<typeof CustomFunctionsUpsertSchema>;

/**
 * Missing declared env names after a post-write unwrap, when any.
 *
 * @param declared - Names the agent asked to ensure
 * @param verified - Names present on the readable version after write
 * @returns Warning string or undefined when all declared names persisted
 */
function envPersistWarningFor(
  declared: string[] | undefined,
  verified: string[],
): string | undefined {
  if (!declared || declared.length === 0) {
    return undefined;
  }
  const verifiedSet = new Set(verified);
  const missing = declared.filter((name) => !verifiedSet.has(name));
  if (missing.length === 0) {
    return undefined;
  }
  return (
    `Declared envVarNames did not appear on the readable version after save: ${missing.join(
      ', ',
    )}. Do not tell the user they were set. Retry upsert with envVarNames (omit code on ` +
    'update to keep stored code) or add the names in the dashboard Environment Variables tab.'
  );
}

/**
 * Whether two host lists match ignoring order.
 *
 * @param left - First host list
 * @param right - Second host list
 * @returns True when both lists contain the same hosts
 */
function sameHostSet(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.every((host, index) => host === sortedRight[index]);
}

/**
 * Declared allowedHosts that did not match the post-write readable version.
 *
 * @param declared - Hosts the agent asked to set (omit = no check)
 * @param verified - Hosts present on the readable version after write
 * @returns Warning string or undefined when hosts match (order-insensitive)
 */
function allowedHostsPersistWarningFor(
  declared: string[] | undefined,
  verified: string[],
): string | undefined {
  if (declared === undefined) {
    return undefined;
  }
  if (sameHostSet(declared, verified)) {
    return undefined;
  }
  const declaredLabel = declared.length > 0 ? declared.join(', ') : '(empty = localhost only)';
  const verifiedLabel = verified.length > 0 ? verified.join(', ') : '(empty = localhost only)';
  return (
    `Declared allowedHosts did not match the readable version after save. Declared: ` +
    `${declaredLabel}. Verified: ${verifiedLabel}. Do not tell the user hosts were updated. ` +
    'Retry custom_functions_upsert with allowedHosts (omit code on update to keep stored ' +
    'code). On update, omit allowedHosts to preserve existing hosts — [] wipes to ' +
    'localhost-only. Confirm with custom_functions_get_code (hosts are not shown in the ' +
    'Admin Dashboard).'
  );
}

export function createCustomFunctionsUpsertTool(clients: ToolClients) {
  const graphql = clients.graphql as CustomFunctionsMixin;
  return defineTool({
    name: 'custom_functions_upsert',
    description:
      'Create or update a Custom Function from plaintext TypeScript. Never pass secrets, API keys, ' +
      'or credentials: envVarNames creates environment variable placeholders the user fills in the ' +
      'dashboard. allowedHosts sets which domains the code may call (omit on update to keep). ' +
      'Updates write a draft; omit code to change only settings. Testing is optional. On create, ' +
      'omit sombraId and dataSiloId unless an error asks for them; use a unique name.',
    category: 'Custom Functions',
    readOnly: false,
    requireSombra: true,
    confirmation: {
      hint:
        'Creates or updates a Custom Function from the code in the call arguments. Updates write a ' +
        'draft; setActive or promote can make GENERAL code live. allowedHosts replaces the saved ' +
        'network allowlist ([] means localhost only). envVarNames only adds placeholder names; no ' +
        'secret values are set. DSR create without dataSiloId also creates a data silo. Check name, ' +
        'type, code, allowedHosts, envVarNames, setActive, and promote before agreeing.',
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    zodSchema: CustomFunctionsUpsertSchema,
    handler: async ({
      id,
      versionId,
      type,
      dataSiloId,
      sombraId,
      name,
      description,
      code,
      envVarNames,
      environmentVariables,
      allowedHosts,
      allowThirdPartyImports,
      timeoutMs,
      setActive,
      promote,
      testPayloads,
    }) => {
      let resolvedSombraId = sombraId;
      let resolvedDataSiloId = dataSiloId;
      let createdDataSiloId: string | undefined;

      const needsSombraId = !id && (type === 'GENERAL' || (type === 'DSR' && !dataSiloId));
      if (needsSombraId) {
        resolvedSombraId = await resolveSombraIdForCreate(
          () => graphql.listSombras(),
          clients.rest,
          resolvedSombraId,
        );
      }

      if (!id && type === 'DSR' && !resolvedDataSiloId) {
        const dataSilo = await graphql.createCustomFunctionDataSilo({
          title: name ?? 'Custom Function',
          sombraId: resolvedSombraId!,
        });
        createdDataSiloId = dataSilo.id;
        resolvedDataSiloId = dataSilo.id;
      }

      try {
        // Secret values never come from the agent. Stored values are preserved on update via
        // unwrap + re-sign; envVarNames / environmentVariables only add placeholders or metadata.
        let resolvedCode = code;
        let resolvedAllowedHosts = allowedHosts ?? [];
        let resolvedAllowThirdPartyImports = allowThirdPartyImports;
        let resolvedTimeoutMs = timeoutMs;
        let envEntries: CustomFunctionEnvEntry[] = [];

        const sombraVersion = await graphql.getPrimarySombraVersion();
        const supportsSplitEnv = sombraSupportsCustomFunctionSplitEnv(sombraVersion);

        if (id) {
          const stored = await graphql.getSignedCustomFunctionVersion(id, versionId);
          const source = await clients.rest.unwrapCustomFunction({
            signedCodeJwt: stored.signedCodeJwt,
            signedCodeContextJwt: stored.signedCodeContextJwt,
          });
          const decodedStored = decodeStoredContextJwt(stored.signedCodeContextJwt);
          envEntries = envEntriesFromUnwrappedContext(source.context, decodedStored);
          if (resolvedCode === undefined) {
            resolvedCode = source.code;
          }
          if (allowedHosts === undefined) {
            resolvedAllowedHosts = source.context.allowedHosts;
          }
          if (allowThirdPartyImports === undefined) {
            resolvedAllowThirdPartyImports = source.context.allowThirdPartyImports;
          }
          if (timeoutMs === undefined) {
            resolvedTimeoutMs = source.context.timeoutMs;
          }
          resolvedDataSiloId = resolvedDataSiloId ?? stored.customFunction.dataSiloId;
          resolvedSombraId = resolvedSombraId ?? stored.customFunction.sombraId;
        }

        if (!resolvedCode) {
          throw new Error('Pass plaintext TypeScript code when creating a Custom Function');
        }

        envEntries = applyEnvVarNames(envEntries, envVarNames);
        envEntries = applyEnvironmentVariablesInput(envEntries, environmentVariables);

        const signContext = buildCustomFunctionSignContext({
          envEntries,
          supportsSplitEnv,
          allowedHosts: resolvedAllowedHosts,
          allowThirdPartyImports: resolvedAllowThirdPartyImports,
          timeoutMs: resolvedTimeoutMs,
        });

        const signed = await clients.rest.signCustomFunction({
          code: resolvedCode,
          context: signContext,
        });

        const testResults: (CustomFunctionTestRunView & {
          /** DSR payload subtype when provided */
          payloadType?: 'DATA_POINT' | 'REQUEST_ENRICHER';
        })[] = [];
        if (testPayloads && testPayloads.length > 0) {
          if (type === 'DSR' && !resolvedDataSiloId) {
            throw new Error(
              `Custom function ${id} has no linked data silo. Pass dataSiloId when using testPayloads.`,
            );
          }
          for (const testPayload of testPayloads) {
            const run = await executeCustomFunctionTestRun(graphql, clients.rest, {
              type,
              // Pre-save runs sign fresh code. GraphQL rejects JWTs when id is set.
              signed,
              payload: testPayload.payload,
              payloadType: testPayload.payloadType,
              sombraId: resolvedSombraId,
              dataSiloId: resolvedDataSiloId,
              markSuccessfulTestRun: false,
            });
            testResults.push({
              ...run.result,
              payloadType: testPayload.payloadType,
            });
          }
        }

        const successfulTestRun = testResults.length > 0 && testResults.every((run) => run.passed);
        const customFunction = id
          ? await graphql.updateCustomFunction({
              id,
              versionId,
              name,
              description,
              ...(successfulTestRun ? { successfulTestRun: true } : {}),
              ...signed,
            })
          : await graphql.createCustomFunction({
              type,
              dataSiloId: resolvedDataSiloId,
              // DSR execution gateway is owned by the data silo; GraphQL rejects sombraId.
              sombraId: type === 'GENERAL' ? resolvedSombraId : undefined,
              name,
              description,
              setActive: type === 'GENERAL' ? setActive : undefined,
              ...(successfulTestRun ? { successfulTestRun: true } : {}),
              ...signed,
            });

        let dependencyWarnings;
        let result = customFunction;
        if (id && promote) {
          const draft = customFunction.draftVersion;
          if (!draft) {
            throw new Error(
              `Custom function ${customFunction.id} did not return a pending draft to promote.`,
            );
          }
          const promotion = await graphql.promoteCustomFunctionVersion(customFunction.id, draft.id);
          result = promotion.customFunction;
          dependencyWarnings = promotion.dependencyWarnings;
        }

        // Verify env + hosts from the readable version (draft when pending, else active) —
        // never echo the pre-write local merge / signed request.
        const verifiedSigned = await graphql.getSignedCustomFunctionVersion(result.id);
        const verifiedSource = await clients.rest.unwrapCustomFunction({
          signedCodeJwt: verifiedSigned.signedCodeJwt,
          signedCodeContextJwt: verifiedSigned.signedCodeContextJwt,
        });
        const verifiedDecoded = decodeStoredContextJwt(verifiedSigned.signedCodeContextJwt);
        const verifiedEnvNames = verifiedDecoded
          ? envKeyNamesFromStoredContext(verifiedDecoded)
          : Object.keys(verifiedSource.context.userDefinedEnv);
        const verifiedAllowedHosts = verifiedSource.context.allowedHosts ?? [];
        const envPersistWarning = envPersistWarningFor(envVarNames, verifiedEnvNames);
        const allowedHostsPersistWarning = allowedHostsPersistWarningFor(
          allowedHosts,
          verifiedAllowedHosts,
        );

        const selectedVersion = result.draftVersion ?? result.activeVersion;
        // Only advertise names that actually persisted on the readable version.
        const nextStep = result.hasPendingDraft
          ? customFunctionNextStep({
              kind: 'draft',
              id: result.id,
              draftVersionId: result.draftVersion?.id,
              envVarNames: verifiedEnvNames.length > 0 ? verifiedEnvNames : undefined,
            })
          : customFunctionNextStep({
              kind: promote ? 'promoted' : 'created',
              id: result.id,
              envVarNames: verifiedEnvNames.length > 0 ? verifiedEnvNames : undefined,
            });
        return createToolResult(true, {
          customFunction: result,
          versionLifecycleState: selectedVersion?.lifecycleState,
          readableVersionId: verifiedSigned.version.id,
          dependencyWarnings,
          testResults: testResults.length > 0 ? testResults : undefined,
          envVarNames: verifiedEnvNames,
          envPersistWarning,
          allowedHosts: verifiedAllowedHosts,
          allowedHostsPersistWarning,
          dashboardHint: customFunctionDashboardHint(clients.dashboardUrl, result.id),
          nextStep,
        });
      } catch (error) {
        if (createdDataSiloId) {
          try {
            await graphql.deleteDataSilo(createdDataSiloId);
          } catch {
            // Ignore rollback failures so the original create error is surfaced.
          }
        }
        throw mapCustomFunctionUpsertError(error, { dataSiloId: resolvedDataSiloId });
      }
    },
  });
}
