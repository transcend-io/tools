import {
  createToolResult,
  defineTool,
  ErrorCode,
  ToolError,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import { CustomFunctionType } from '@transcend-io/privacy-types';

import type { CustomFunctionSummary, CustomFunctionsMixin } from '../graphql.js';
import {
  applyEnvironmentVariablesInput,
  assertSignContextPreservesEnvKeys,
  buildCustomFunctionSignContext,
  envEntriesFromUnwrappedContext,
  plainToSecretFlipKeys,
  removeEnvironmentVariableKeys,
  secretToPlainFlipError,
  sombraSupportsCustomFunctionSplitEnv,
  type CustomFunctionEnvEntry,
} from '../helpers/buildCustomFunctionSignContext.js';
import {
  decodeStoredContextJwt,
  envKeyNamesFromStoredContext,
} from '../helpers/decodeStoredContextJwt.js';
import { mapCustomFunctionUpsertError } from '../helpers/mapUpsertError.js';
import { customFunctionDashboardHint, customFunctionNextStep } from '../helpers/nextStep.js';
import {
  buildReadableVersionContext,
  unsetEnvironmentVariableKeys,
} from '../helpers/readableCustomFunctionVersion.js';
import {
  resolveSigningSombraVersion,
  resolveSombraIdForCreate,
} from '../helpers/resolveSombraId.js';
import {
  assertUpsertVersionIdEditable,
  hasAnyUpsertFieldOnUpdate,
  isMetadataOnlyUpdate,
  resolveUpsertVersionId,
} from '../helpers/upsertValidation.js';
import { validateEnvironmentVariableKey } from '../helpers/validateEnvironmentVariableKey.js';

const EnvironmentVariableSchema = z.object({
  key: z.string().min(1).describe('Variable name (CONSTANT_CASE)'),
  isSecret: z
    .boolean()
    .describe(
      'When true, the user sets the value in the dashboard; never pass value. Plain to secret ' +
        'encrypts the current value; rotate it if sensitive',
    ),
  value: z
    .string()
    .optional()
    .describe('Plaintext only. Omit on update to keep the stored value. Never pass for secrets'),
});

export const CustomFunctionsUpsertSchema = z
  .object({
    id: z.string().optional().describe('ID to update; omit to create'),
    versionId: z
      .string()
      .optional()
      .describe(
        'Pending draft to edit; omit to continue it (or start one from active). Requires id',
      ),
    type: z
      .nativeEnum(CustomFunctionType)
      .optional()
      .describe('Required on create (DSR or GENERAL). Inferred from the stored function on update'),
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
    description: z
      .string()
      .optional()
      .describe('Behavior description; applies immediately without creating a version'),
    code: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Plaintext TypeScript: export default async function ({ payload, environment }) and use ' +
          'global fetch. Required on create; on update omit to keep stored code (settings-only draft).',
      ),
    environmentVariables: z
      .array(EnvironmentVariableSchema)
      .optional()
      .describe(
        'Declare env vars with isSecret; merges with saved vars (use removeEnvironmentVariables to ' +
          'delete). Plain values may be set here; secrets are dashboard-only. Omit to leave env ' +
          'unchanged on update.',
      ),
    removeEnvironmentVariables: z
      .array(z.string())
      .optional()
      .describe('Env var keys to delete on update; requires id'),
    allowedHosts: z
      .array(z.string())
      .optional()
      .describe(
        'Outbound hostname allowlist, no scheme. A provided list replaces the saved one. [] means ' +
          "localhost only; add 'localhost' for local sdk calls. On update, omit to keep the saved list.",
      ),
    allowThirdPartyImports: z.boolean().optional().describe('Allow third-party imports'),
    timeoutMs: z.number().int().positive().optional().describe('Timeout ms'),
  })
  .superRefine((input, context) => {
    if (!input.id && !input.type) {
      context.addIssue({
        code: 'custom',
        path: ['type'],
        message: 'Pass type (DSR or GENERAL) when creating a Custom Function',
      });
    }
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
    if (input.removeEnvironmentVariables?.length && !input.id) {
      context.addIssue({
        code: 'custom',
        path: ['removeEnvironmentVariables'],
        message:
          'removeEnvironmentVariables is only valid when updating an existing custom function',
      });
    }
    const envKeys = new Set(
      (input.environmentVariables ?? []).map((row) => row.key.trim()).filter(Boolean),
    );
    for (const [index, key] of (input.removeEnvironmentVariables ?? []).entries()) {
      const trimmed = key.trim();
      if (trimmed && envKeys.has(trimmed)) {
        context.addIssue({
          code: 'custom',
          path: ['removeEnvironmentVariables', index],
          message: `Do not list "${trimmed}" in both environmentVariables and removeEnvironmentVariables`,
        });
      }
    }
    for (const [index, row] of (input.environmentVariables ?? []).entries()) {
      const keyError = validateEnvironmentVariableKey(row.key);
      if (keyError) {
        context.addIssue({
          code: 'custom',
          path: ['environmentVariables', index, 'key'],
          message: keyError,
        });
      }
      if (row.isSecret && row.value !== undefined) {
        context.addIssue({
          code: 'custom',
          path: ['environmentVariables', index, 'value'],
          message:
            'Do not pass value when isSecret is true. The user sets secret values in the dashboard.',
        });
      }
    }
  });
export type CustomFunctionsUpsertInput = z.infer<typeof CustomFunctionsUpsertSchema>;

/**
 * Post-save env key mismatches (missing kept keys, failed removals, or undeclared adds).
 *
 * @param priorKeys - Env keys before this upsert (update only)
 * @param removedKeys - Keys the agent asked to delete
 * @param declaredKeys - Keys the agent declared in environmentVariables
 * @param verified - Keys present on the readable version after write
 * @returns Warning strings when verification disagrees with intent
 */
function envKeyWarnings(
  priorKeys: string[],
  removedKeys: string[] | undefined,
  declaredKeys: string[] | undefined,
  verified: string[],
): { persist?: string; remove?: string } {
  const verifiedSet = new Set(verified);
  const removeSet = new Set((removedKeys ?? []).map((key) => key.trim()).filter(Boolean));
  const shouldKeep = priorKeys.filter((key) => !removeSet.has(key));
  const missingKept = shouldKeep.filter((key) => !verifiedSet.has(key));
  const missingDeclared = (declaredKeys ?? [])
    .map((key) => key.trim())
    .filter(Boolean)
    .filter((key) => !verifiedSet.has(key));
  const missing = [...new Set([...missingKept, ...missingDeclared])];
  const stillPresent = (removedKeys ?? [])
    .map((key) => key.trim())
    .filter(Boolean)
    .filter((key) => verifiedSet.has(key));

  const persist =
    missing.length > 0
      ? `Environment variable keys missing after save: ${missing.join(', ')}. Do not tell the user ` +
        'they were set or preserved. Retry custom_functions_upsert (omit code on update to keep ' +
        'stored code) or use the dashboard Environment Variables tab.'
      : undefined;
  const remove =
    stillPresent.length > 0
      ? `removeEnvironmentVariables keys still present after save: ${stillPresent.join(', ')}. Do not ` +
        'tell the user they were removed. Retry custom_functions_upsert with removeEnvironmentVariables ' +
        '(omit code on update to keep stored code).'
      : undefined;
  return { persist, remove };
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
      'Create or update a Custom Function from plaintext TypeScript. name/description apply ' +
      'immediately; code and runtime settings write a draft — run custom_functions_test_run ' +
      '{ id }, then custom_functions_promote_version. Never pass secret values: use ' +
      'environmentVariables with isSecret true and dashboard fill-in. allowedHosts sets outbound ' +
      'domains (omit on update to keep). On create, omit sombraId and dataSiloId unless an error ' +
      'asks for them; use a unique name.',
    category: 'Custom Functions',
    readOnly: false,
    requireSombra: true,
    confirmation: {
      hint:
        'Creates or updates a Custom Function from the code in the call arguments. Code and ' +
        'runtime settings write a draft; test_run then promote_version make changes live. ' +
        'allowedHosts replaces the saved network allowlist ([] means localhost only). ' +
        'environmentVariables never sets secret values. DSR create without dataSiloId also ' +
        'creates a data silo. Check name, type, code, allowedHosts, and environmentVariables ' +
        'before agreeing.',
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    zodSchema: CustomFunctionsUpsertSchema,
    handler: async ({
      id,
      versionId,
      type: inputType,
      dataSiloId,
      sombraId,
      name,
      description,
      code,
      environmentVariables,
      removeEnvironmentVariables,
      allowedHosts,
      allowThirdPartyImports,
      timeoutMs,
    }) => {
      let resolvedSombraId = sombraId;
      let resolvedDataSiloId = dataSiloId;
      let createdDataSiloId: string | undefined;

      if (
        id &&
        !hasAnyUpsertFieldOnUpdate({
          code,
          environmentVariables,
          removeEnvironmentVariables,
          allowedHosts,
          allowThirdPartyImports,
          timeoutMs,
          name,
          description,
        })
      ) {
        throw new ToolError(
          ErrorCode.VALIDATION_ERROR,
          'Nothing to update. Pass name, description, code, environmentVariables, allowedHosts, ' +
            'or other version fields.',
          false,
        );
      }

      if (
        id &&
        isMetadataOnlyUpdate({
          id,
          code,
          environmentVariables,
          removeEnvironmentVariables,
          allowedHosts,
          allowThirdPartyImports,
          timeoutMs,
          name,
          description,
        })
      ) {
        const customFunction = await graphql.updateCustomFunction({
          id,
          name,
          description,
        });
        const nextStep = customFunctionNextStep({ kind: 'metadataUpdated', id: customFunction.id });
        return createToolResult(true, {
          customFunction,
          nextStep,
        });
      }

      let resolvedVersionId = versionId;
      let storedSummary: CustomFunctionSummary | undefined;
      if (id) {
        storedSummary = await graphql.getCustomFunctionSummary(id);
        if (inputType && inputType !== storedSummary.type) {
          throw new ToolError(
            ErrorCode.VALIDATION_ERROR,
            `type cannot be changed after create (stored type is ${storedSummary.type}).`,
            false,
            { storedType: storedSummary.type },
          );
        }
        const sombraChange =
          sombraId !== undefined && sombraId !== (storedSummary.sombraId ?? undefined);
        if (versionId !== undefined) {
          assertUpsertVersionIdEditable(storedSummary, versionId);
        }
        resolvedVersionId = resolveUpsertVersionId(storedSummary, versionId, sombraChange);
      }

      const storedForType = id
        ? await graphql.getSignedCustomFunctionVersion(id, resolvedVersionId)
        : undefined;
      const type = inputType ?? storedForType?.customFunction.type;
      if (!type) {
        throw new Error('Pass type when creating a Custom Function');
      }

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
        let resolvedCode = code;
        let resolvedAllowedHosts = allowedHosts ?? [];
        let resolvedAllowThirdPartyImports = allowThirdPartyImports;
        let resolvedTimeoutMs = timeoutMs;
        let envEntries: CustomFunctionEnvEntry[] = [];
        let priorEnvKeys: string[] = [];

        let envClassificationWarning: string | undefined;
        if (id) {
          const stored = storedForType!;
          const source = await clients.rest.unwrapCustomFunction({
            signedCodeJwt: stored.signedCodeJwt,
            signedCodeContextJwt: stored.signedCodeContextJwt,
          });
          const decodedStored = decodeStoredContextJwt(stored.signedCodeContextJwt);
          envEntries = envEntriesFromUnwrappedContext(source.context, decodedStored);
          priorEnvKeys = envEntries.map((entry) => entry.key);
          const flipError = secretToPlainFlipError(envEntries, environmentVariables);
          if (flipError) {
            throw new ToolError(ErrorCode.VALIDATION_ERROR, flipError, false, {
              recovery: 'dashboard',
            });
          }
          const plainToSecretKeys = plainToSecretFlipKeys(envEntries, environmentVariables);
          if (plainToSecretKeys.length > 0) {
            envClassificationWarning = plainToSecretKeys
              .map(
                (key) =>
                  `"${key}" now encrypts its existing value. Earlier versions still contain it in ` +
                  'plaintext; rotate it in the dashboard if it is sensitive.',
              )
              .join(' ');
          }
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

        envEntries = applyEnvironmentVariablesInput(envEntries, environmentVariables);
        envEntries = removeEnvironmentVariableKeys(envEntries, removeEnvironmentVariables);

        const sombras = await graphql.listSombras();
        const sombraVersion = resolveSigningSombraVersion(
          sombras,
          clients.rest,
          resolvedSombraId ?? storedSummary?.sombraId,
        );
        const supportsSplitEnv = sombraSupportsCustomFunctionSplitEnv(sombraVersion);

        const signContext = buildCustomFunctionSignContext({
          envEntries,
          supportsSplitEnv,
          allowedHosts: resolvedAllowedHosts,
          allowThirdPartyImports: resolvedAllowThirdPartyImports,
          timeoutMs: resolvedTimeoutMs,
        });
        const expectedEnvKeys = envEntries.map((entry) => entry.key);
        assertSignContextPreservesEnvKeys(expectedEnvKeys, signContext);

        const signed = await clients.rest.signCustomFunction({
          code: resolvedCode,
          context: signContext,
        });

        const customFunction = id
          ? await graphql.updateCustomFunction({
              id,
              versionId: resolvedVersionId,
              name,
              description,
              ...signed,
            })
          : await graphql.createCustomFunction({
              type,
              dataSiloId: resolvedDataSiloId,
              sombraId: type === 'GENERAL' ? resolvedSombraId : undefined,
              name,
              description,
              ...signed,
            });
        createdDataSiloId = undefined;

        const selectedVersion = customFunction.draftVersion ?? customFunction.activeVersion;
        let readableVersionId: string | undefined;
        let settings: ReturnType<typeof buildReadableVersionContext>['settings'] | undefined;
        let environmentVariablesOut:
          | ReturnType<typeof buildReadableVersionContext>['environmentVariables']
          | undefined;
        let envPersistWarning: string | undefined;
        let envRemoveWarning: string | undefined;
        let allowedHostsPersistWarning: string | undefined;
        let unsetKeys: string[] = [];
        let verificationWarning: string | undefined;

        try {
          const verifiedSigned = await graphql.getSignedCustomFunctionVersion(customFunction.id);
          const verifiedSource = await clients.rest.unwrapCustomFunction({
            signedCodeJwt: verifiedSigned.signedCodeJwt,
            signedCodeContextJwt: verifiedSigned.signedCodeContextJwt,
          });
          const readable = buildReadableVersionContext(
            verifiedSigned.signedCodeContextJwt,
            verifiedSource.context,
          );
          const verifiedDecoded = decodeStoredContextJwt(verifiedSigned.signedCodeContextJwt);
          const verifiedEnvNames = verifiedDecoded
            ? envKeyNamesFromStoredContext(verifiedDecoded)
            : readable.environmentVariables.map((row) => row.key);
          const declaredKeys = environmentVariables?.map((row) => row.key.trim()).filter(Boolean);
          const removedKeys = removeEnvironmentVariables?.map((key) => key.trim()).filter(Boolean);
          const envWarnings = envKeyWarnings(
            priorEnvKeys,
            removedKeys,
            declaredKeys,
            verifiedEnvNames,
          );
          envPersistWarning = envWarnings.persist;
          envRemoveWarning = envWarnings.remove;
          allowedHostsPersistWarning = allowedHostsPersistWarningFor(
            allowedHosts,
            readable.settings.allowedHosts,
          );
          unsetKeys = unsetEnvironmentVariableKeys(readable.environmentVariables);
          readableVersionId = verifiedSigned.version.id;
          settings = readable.settings;
          environmentVariablesOut = readable.environmentVariables;
        } catch (verificationError) {
          const message =
            verificationError instanceof Error
              ? verificationError.message
              : String(verificationError);
          verificationWarning =
            `Save succeeded but post-save verification failed: ${message}. Call custom_functions_get_code ` +
            'to confirm the draft before promoting.';
        }

        const nextStep = customFunction.hasPendingDraft
          ? customFunctionNextStep({
              kind: 'draft',
              id: customFunction.id,
              draftVersionId: customFunction.draftVersion?.id,
              unsetEnvKeys: unsetKeys.length > 0 ? unsetKeys : undefined,
            })
          : customFunctionNextStep({
              kind: 'created',
              id: customFunction.id,
              unsetEnvKeys: unsetKeys.length > 0 ? unsetKeys : undefined,
            });

        return createToolResult(true, {
          customFunction,
          versionLifecycleState: selectedVersion?.lifecycleState,
          ...(readableVersionId ? { readableVersionId } : {}),
          ...(settings ? { settings } : {}),
          ...(environmentVariablesOut ? { environmentVariables: environmentVariablesOut } : {}),
          envPersistWarning,
          envRemoveWarning,
          ...(envClassificationWarning ? { envClassificationWarning } : {}),
          allowedHostsPersistWarning,
          ...(verificationWarning ? { verificationWarning } : {}),
          ...(unsetKeys.length > 0
            ? {
                dashboardHint: customFunctionDashboardHint(clients.dashboardUrl, customFunction.id),
              }
            : {}),
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
