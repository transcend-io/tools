import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import { CustomFunctionType } from '@transcend-io/privacy-types';

import type { CustomFunctionsMixin } from '../graphql.js';
import { customFunctionDashboardUrl, customFunctionNextStep } from '../helpers/nextStep.js';
import { resolveSombraIdForCreate } from '../helpers/resolveSombraId.js';

export const CustomFunctionsUpsertSchema = z
  .object({
    id: z
      .string()
      .optional()
      .describe('Custom function ID to update; omit to create a new custom function'),
    versionId: z
      .string()
      .optional()
      .describe(
        'Existing draft version ID to update in place. Only valid when id is set. ' +
          'Omit to create or replace the pending draft',
      ),
    type: z
      .nativeEnum(CustomFunctionType)
      .describe('DSR for data-silo privacy request code, or GENERAL for Rules Automation code'),
    dataSiloId: z
      .string()
      .optional()
      .describe(
        'Existing Custom Function data silo ID when creating a DSR function. Omit to auto-create ' +
          'a customFunction integration on the resolved gateway. Do not pass webhook silos; filter ' +
          'inventory_list_data_silos with customSiloConnectionStrategy=CUSTOM_FUNCTION. The ' +
          'returned dataSiloId is only needed later if you trial unsaved DSR code',
      ),
    sombraId: z
      .string()
      .optional()
      .describe(
        'Sombra gateway ID. Omit unless this tool errors with a list of gateway IDs. Never pass ' +
          'on DSR create — GraphQL rejects it because the data silo owns the gateway. When unknown, ' +
          'call custom_functions_list first',
      ),
    name: z
      .string()
      .optional()
      .describe(
        'Display name. Required when creating (id omitted). Use a unique prefix so ' +
          'custom_functions_list text search can find this function',
      ),
    description: z.string().optional().describe('Description of the custom function behavior'),
    code: z
      .string()
      .min(1)
      .describe(
        'Plaintext TypeScript source. GENERAL requires a callable default export; DSR requires ' +
          'callable default and enricher exports',
      ),
    userDefinedEnv: z
      .record(z.string(), z.string())
      .optional()
      .default({})
      .describe('Environment variables available to the function at runtime'),
    allowedHosts: z
      .array(z.string())
      .optional()
      .default([])
      .describe('Network hosts the function is allowed to contact'),
    allowThirdPartyImports: z
      .boolean()
      .optional()
      .describe('Allow imports from Sombra-approved third-party repositories'),
    timeoutMs: z
      .number()
      .int()
      .positive()
      .optional()
      .describe('Maximum function runtime in milliseconds'),
    setActive: z
      .boolean()
      .optional()
      .default(true)
      .describe('Create GENERAL functions as active immediately; ignored for DSR and updates'),
    promote: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        'Promote the resulting draft after an update. Requires id. Default is false so updates ' +
          'stay as drafts; call custom_functions_promote_version with draftVersion.id when ready',
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
      'Create or update a Custom Function from plaintext TypeScript. Happy path: upsert ' +
      '(omit sombraId and dataSiloId, pass a unique name) → custom_functions_test_run with { id } ' +
      'to execute → draft upsert (promote false) → custom_functions_promote_version. Creating a ' +
      'DSR function without dataSiloId also creates a customFunction data silo. Updates create or ' +
      'replace a draft.',
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
