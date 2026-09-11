import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import { CustomFunctionType } from '@transcend-io/privacy-types';

import type { CustomFunctionsMixin } from '../graphql.js';
import { customFunctionDashboardUrl, customFunctionNextStep } from '../helpers/nextStep.js';
import { resolveSombraIdForCreate } from '../helpers/resolveSombraId.js';

export const CustomFunctionsUpsertSchema = z
  .object({
    id: z.string().optional().describe('ID to update; omit to create'),
    versionId: z.string().optional().describe('Draft version ID to update; requires id'),
    type: z.nativeEnum(CustomFunctionType).describe('DSR or GENERAL'),
    dataSiloId: z
      .string()
      .optional()
      .describe(
        'Existing CUSTOM_FUNCTION silo for DSR create; omit to auto-create. Not webhook silos.',
      ),
    sombraId: z
      .string()
      .optional()
      .describe('Gateway ID; omit unless an error lists options. Never on DSR create.'),
    name: z.string().optional().describe('Required on create; keep unique for list search'),
    description: z.string().optional().describe('Behavior description'),
    code: z
      .string()
      .min(1)
      .describe('Plaintext TypeScript (GENERAL: default export; DSR: default + enricher)'),
    userDefinedEnv: z
      .record(z.string(), z.string())
      .optional()
      .default({})
      .describe('Runtime env vars'),
    allowedHosts: z.array(z.string()).optional().default([]).describe('Allowed hosts'),
    allowThirdPartyImports: z.boolean().optional().describe('Allow third-party imports'),
    timeoutMs: z.number().int().positive().optional().describe('Timeout ms'),
    setActive: z
      .boolean()
      .optional()
      .default(true)
      .describe('Activate GENERAL on create; ignored for DSR/updates'),
    promote: z
      .boolean()
      .optional()
      .default(false)
      .describe('After update, promote draft (requires id); else use promote_version'),
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

export function createCustomFunctionsUpsertTool(clients: ToolClients) {
  const graphql = clients.graphql as CustomFunctionsMixin;
  return defineTool({
    name: 'custom_functions_upsert',
    description:
      'Create/update a Custom Function from TypeScript. Prefer omit sombraId/dataSiloId with a ' +
      'unique name; DSR create without dataSiloId also creates a customFunction silo. Updates ' +
      'write a draft (promote false by default).',
    category: 'Custom Functions',
    readOnly: false,
    requireSombra: true,
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
      userDefinedEnv,
      allowedHosts,
      allowThirdPartyImports,
      timeoutMs,
      setActive,
      promote,
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
        const signed = await clients.rest.signCustomFunction({
          code,
          context: {
            userDefinedEnv,
            allowedHosts,
            allowThirdPartyImports,
            timeoutMs,
          },
        });

        const customFunction = id
          ? await graphql.updateCustomFunction({
              id,
              versionId,
              name,
              description,
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

        const selectedVersion = result.draftVersion ?? result.activeVersion;
        const nextStep = result.hasPendingDraft
          ? customFunctionNextStep({
              kind: 'draft',
              id: result.id,
              draftVersionId: result.draftVersion?.id,
            })
          : customFunctionNextStep({
              kind: promote ? 'promoted' : 'created',
              id: result.id,
            });
        return createToolResult(true, {
          customFunction: result,
          versionLifecycleState: selectedVersion?.lifecycleState,
          dependencyWarnings,
          dashboardHint: `Review this function at ${customFunctionDashboardUrl(clients.dashboardUrl, result.id)}.`,
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
        throw error;
      }
    },
  });
}
