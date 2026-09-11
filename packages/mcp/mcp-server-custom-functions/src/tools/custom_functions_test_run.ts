import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import { CustomFunctionPayloadType, CustomFunctionType } from '@transcend-io/privacy-types';

import type { CustomFunctionsMixin } from '../graphql.js';
import { executeCustomFunctionTestRun } from '../helpers/customFunctionTestRun.js';
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
    payload: z
      .record(z.string(), z.unknown())
      .optional()
      .describe('Optional JSON body; omit for type-specific defaults'),
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
    userDefinedEnv: z
      .record(z.string(), z.string())
      .optional()
      .default({})
      .describe('Runtime env vars'),
    allowedHosts: z.array(z.string()).optional().default([]).describe('Allowed hosts'),
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
  });
export type CustomFunctionsTestRunInput = z.infer<typeof CustomFunctionsTestRunSchema>;

export function createCustomFunctionsTestRunTool(clients: ToolClients) {
  const graphql = clients.graphql as CustomFunctionsMixin;
  return defineTool({
    name: 'custom_functions_test_run',
    description:
      'Test Custom Function code (DSR or GENERAL). Pass { id } alone to run the saved version; ' +
      'pass code for an unsaved trial. Responses include passed, exitCode, logs, error, and timeMs.',
    category: 'Custom Functions',
    readOnly: false,
    requireSombra: true,
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
      userDefinedEnv,
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
        userDefinedEnv,
        allowedHosts,
        allowThirdPartyImports,
        timeoutMs,
        markSuccessfulTestRun: storedRun,
      });
      const nextStep = result.passed
        ? storedRun
          ? customFunctionNextStep({
              kind:
                customFunction?.draftVersion?.successfulTestRun === true ||
                customFunction?.activeVersion?.successfulTestRun === true
                  ? 'storedTestPassed'
                  : 'storedTestNeedsSave',
              id: id!,
            })
          : customFunctionNextStep({ kind: 'unsavedTestPassed', id: id ?? '' })
        : undefined;
      return createToolResult(true, {
        ...result,
        customFunction,
        nextStep,
      });
    },
  });
}
