import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import { CustomFunctionPayloadType, CustomFunctionType } from '@transcend-io/privacy-types';

import type { CustomFunctionsMixin } from '../graphql.js';
import {
  executeCustomFunctionTestRun,
  type CustomFunctionTestRunView,
} from '../helpers/customFunctionTestRun.js';
import { mapCustomFunctionUpsertError } from '../helpers/mapUpsertError.js';
import { customFunctionDashboardHint, customFunctionNextStep } from '../helpers/nextStep.js';
import { mergeEnvVarNames } from '../helpers/redactEnv.js';
import { resolveSombraIdForCreate } from '../helpers/resolveSombraId.js';

const PAYLOAD_OMIT_GUIDANCE =
  'Strongly prefer omitting — type-specific defaults are used; a hand-built DSR payload ' +
  'missing nested fields fails with an opaque decode error, not helpful validation';

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
        'Existing CUSTOM_FUNCTION silo with connectionState=NOT_CONFIGURED (one DSR function ' +
          'per silo). Prefer omit to auto-create. CONNECTED silos reject attach — check with ' +
          'inventory_get_data_silo first.',
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
        'Env var names to create as placeholders (e.g. API_KEY). Values are a non-empty ' +
          'sentinel so Sombra persists the name — never pass real secrets; the user replaces ' +
          'them in the dashboard. On update, adds missing names and keeps existing values; ' +
          'omit to leave env unchanged.',
      ),
    allowedHosts: z
      .array(z.string())
      .optional()
      .describe(
        'Allowed hosts. Empty = localhost only; any explicit list drops implicit localhost ' +
          "(include 'localhost' if using sdk.fetch). On update, omit keeps existing; " +
          'provided list fully replaces.',
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
        'Optional pre-save tests; sets successfulTestRun only if all pass. Never blocks save. ' +
          'Prefer omitting each payload (type defaults).',
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

export function createCustomFunctionsUpsertTool(clients: ToolClients) {
  const graphql = clients.graphql as CustomFunctionsMixin;
  return defineTool({
    name: 'custom_functions_upsert',
    description:
      'Create or update a Custom Function from plaintext TypeScript. Pass envVarNames to ' +
      'create empty env placeholders; never pass secret values — the user fills them in the ' +
      'dashboard. Updates preserve stored secret values. Save does not require a passing test. ' +
      'On create, omit sombraId and dataSiloId unless an error requires them; pass a unique ' +
      'name for list search. DSR create without dataSiloId also creates a customFunction data ' +
      'silo. DSR attach needs a NOT_CONFIGURED CUSTOM_FUNCTION silo (one function per silo). ' +
      'Updates write a draft; omit code on update for metadata-only changes.',
    category: 'Custom Functions',
    readOnly: false,
    requireSombra: true,
    confirmation: {
      hint:
        'Creates or updates Custom Function code (and allowed hosts / env var names when ' +
        'provided). Secret values are never set by this tool — only empty env placeholders ' +
        'via envVarNames; the user fills secrets in the dashboard. Updates write a draft; ' +
        'setActive or promote can make GENERAL code live. On DSR create without dataSiloId, a ' +
        'customFunction data silo is created too. Check name, type, code, envVarNames, ' +
        'allowedHosts, setActive, and promote before agreeing.',
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
        // Secret values never come from the agent. Stored values are preserved on update;
        // envVarNames only adds non-empty placeholders for missing names (empty string is
        // merge-on-sign “keep prior” and drops new keys).
        let storedEnv: Record<string, string> | undefined;
        let resolvedCode = code;
        let resolvedAllowedHosts = allowedHosts ?? [];
        let resolvedAllowThirdPartyImports = allowThirdPartyImports;
        let resolvedTimeoutMs = timeoutMs;

        if (id) {
          const stored = await graphql.getSignedCustomFunctionVersion(id, versionId);
          const source = await clients.rest.unwrapCustomFunction({
            signedCodeJwt: stored.signedCodeJwt,
            signedCodeContextJwt: stored.signedCodeContextJwt,
          });
          storedEnv = source.context.userDefinedEnv;
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

        const userDefinedEnv = mergeEnvVarNames({ stored: storedEnv, envVarNames });

        const signed = await clients.rest.signCustomFunction({
          code: resolvedCode,
          context: {
            userDefinedEnv,
            allowedHosts: resolvedAllowedHosts,
            allowThirdPartyImports: resolvedAllowThirdPartyImports,
            timeoutMs: resolvedTimeoutMs,
          },
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

        // Verify env from the readable version (draft when pending, else active) — never echo
        // the pre-write local merge.
        const verifiedSigned = await graphql.getSignedCustomFunctionVersion(result.id);
        const verifiedSource = await clients.rest.unwrapCustomFunction({
          signedCodeJwt: verifiedSigned.signedCodeJwt,
          signedCodeContextJwt: verifiedSigned.signedCodeContextJwt,
        });
        const verifiedEnvNames = Object.keys(verifiedSource.context.userDefinedEnv);
        const envPersistWarning = envPersistWarningFor(envVarNames, verifiedEnvNames);

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
        throw mapCustomFunctionUpsertError(error);
      }
    },
  });
}
