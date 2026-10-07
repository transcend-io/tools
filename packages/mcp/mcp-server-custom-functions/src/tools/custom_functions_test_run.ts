import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import { CustomFunctionPayloadType, CustomFunctionType } from '@transcend-io/privacy-types';

import type { CustomFunctionsMixin } from '../graphql.js';
import {
  executeCustomFunctionTestRun,
  PAYLOAD_OMIT_GUIDANCE,
} from '../helpers/customFunctionTestRun.js';
import { customFunctionNextStep } from '../helpers/nextStep.js';

export const CustomFunctionsTestRunSchema = z
  .object({
    id: z
      .string()
      .optional()
      .describe('Saved function ID; prefer alone after upsert. DSR stored runs bind Activity'),
    type: z
      .nativeEnum(CustomFunctionType)
      .optional()
      .describe('Required without id (DSR or GENERAL). Inferred when id is set'),
    code: z
      .string()
      .min(1)
      .optional()
      .describe('Unsaved TypeScript trial; required without id. DSR also needs dataSiloId'),
    payload: z.record(z.string(), z.unknown()).optional().describe(PAYLOAD_OMIT_GUIDANCE),
    payloadType: z
      .enum([CustomFunctionPayloadType.DataPoint, CustomFunctionPayloadType.RequestEnricher])
      .optional()
      .describe('DSR only; defaults to DATA_POINT. Omit for GENERAL'),
    sombraId: z
      .string()
      .optional()
      .describe('GENERAL gateway; omit with id unless an error lists options'),
    dataSiloId: z
      .string()
      .optional()
      .describe('DSR silo; omit with id. Required for unsaved DSR tests'),
    allowedHosts: z
      .array(z.string())
      .optional()
      .describe('Allowlist for unsaved code trials only. [] means localhost only.'),
    allowThirdPartyImports: z.boolean().optional().describe('Allow third-party imports'),
    timeoutMs: z.number().int().positive().optional().describe('Timeout ms'),
  })
  .superRefine((input, context) => {
    if (!input.id && !input.code) {
      context.addIssue({
        code: 'custom',
        path: ['code'],
        message: 'Provide code to test unsaved source, or id to test a stored Custom Function',
      });
    }
    if (!input.id && !input.type) {
      context.addIssue({
        code: 'custom',
        path: ['type'],
        message: 'Pass type when testing unsaved code; it is inferred when id is set',
      });
    }
    if (input.type === 'DSR' && !input.id && !input.dataSiloId) {
      context.addIssue({
        code: 'custom',
        path: ['dataSiloId'],
        message: 'Pass dataSiloId from the upsert response when testing unsaved DSR code',
      });
    }
    if (input.type === 'GENERAL' && input.payloadType) {
      context.addIssue({
        code: 'custom',
        path: ['payloadType'],
        message: 'payloadType is only valid for DSR test runs. Omit payloadType for GENERAL',
      });
    }
    if (input.id && !input.code && input.allowedHosts !== undefined) {
      context.addIssue({
        code: 'custom',
        path: ['allowedHosts'],
        message:
          'allowedHosts only applies to unsaved code trials. Saved runs use the saved allowlist; ' +
          'call custom_functions_upsert with allowedHosts to change it.',
      });
    }
  });
export type CustomFunctionsTestRunInput = z.infer<typeof CustomFunctionsTestRunSchema>;

export function createCustomFunctionsTestRunTool(clients: ToolClients) {
  const graphql = clients.graphql as CustomFunctionsMixin;
  return defineTool({
    name: 'custom_functions_test_run',
    description:
      'Test a Custom Function (saved or unsaved TypeScript). Pass { id } alone for the stored ' +
      'version (uses dashboard env); pass code for a trial without secrets. Prefer omitting ' +
      'payload. DSR or GENERAL. Logs mask all env var values, including plain ones.',
    category: 'Custom Functions',
    readOnly: false,
    requireSombra: true,
    confirmation: {
      hint:
        'Runs Custom Function code on your Sombra gateway with the payload in the call ' +
        'arguments. Stored runs use dashboard Environment Variables; unsaved trials have no ' +
        'secrets. Check id or code, type, and payload before agreeing.',
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    zodSchema: CustomFunctionsTestRunSchema,
    handler: async ({
      id,
      type,
      code,
      payload,
      payloadType,
      sombraId,
      dataSiloId,
      allowedHosts,
      allowThirdPartyImports,
      timeoutMs,
    }) => {
      const storedRun = Boolean(id) && !code;
      const { result, customFunction } = await executeCustomFunctionTestRun(graphql, clients.rest, {
        type,
        id,
        code,
        payload,
        payloadType,
        sombraId,
        dataSiloId,
        // Unsaved trials never take agent-supplied secrets; stored runs use signed JWTs.
        userDefinedEnv: {},
        allowedHosts: allowedHosts ?? [],
        allowThirdPartyImports,
        timeoutMs,
        markSuccessfulTestRun: storedRun,
      });
      const nextStep = result.passed
        ? storedRun
          ? customFunction?.hasPendingDraft
            ? customFunctionNextStep({
                kind: 'storedTestPassed',
                id: id!,
                draftVersionId: customFunction.draftVersion?.id,
              })
            : customFunctionNextStep({ kind: 'storedTestNoDraft', id: id! })
          : customFunctionNextStep({ kind: 'unsavedTestPassed', id: id ?? '' })
        : id
          ? customFunctionNextStep({ kind: 'testFailed', id })
          : undefined;
      return createToolResult(true, {
        ...result,
        customFunction,
        nextStep,
      });
    },
  });
}
