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
      .describe(
        'Preferred after save: pass only this id (omit code) to execute the readable version ' +
          '(active, else latest draft). DSR stored runs bind Activity. GENERAL stored runs replay ' +
          'the saved JWT pair like the dashboard Test button. successfulTestRun is persisted on ' +
          'save (testPayloads or a draft upsert), not by testing an already-active version. ' +
          'Combine with code to trial unsaved edits without binding Activity',
      ),
    type: z
      .nativeEnum(CustomFunctionType)
      .optional()
      .describe(
        'Required when id is omitted. Inferred from the stored function when id is set. DSR for ' +
          'privacy request code, or GENERAL for Rules Automation code',
      ),
    code: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Plaintext TypeScript for unsaved trials only. Required when id is omitted. DSR unsaved ' +
          'trials also need dataSiloId from upsert. GENERAL requires a callable default export; DSR ' +
          'requires callable default and enricher exports',
      ),
    payload: z
      .record(z.string(), z.unknown())
      .optional()
      .describe(
        'JSON test payload. Omit unless you need a specific body. GENERAL defaults to ' +
          '{ "message": "hello world!" } (the backend may add coreIdentifier). DSR uses a stub ' +
          'ACCESS payload; the silo id is injected — do not hand-build extras',
      ),
    payloadType: z
      .enum([CustomFunctionPayloadType.DataPoint, CustomFunctionPayloadType.RequestEnricher])
      .optional()
      .describe('DSR only. Which export to invoke; defaults to DATA_POINT. Omit for GENERAL'),
    sombraId: z
      .string()
      .optional()
      .describe(
        'GENERAL gateway ID. Omit when id is set. For unsaved GENERAL tests, omit unless the tool ' +
          'errors with a list of gateway IDs',
      ),
    dataSiloId: z
      .string()
      .optional()
      .describe(
        'DSR data silo ID. Omit when id is set (the stored silo is used). Required for unsaved DSR ' +
          'tests: pass the dataSiloId from the upsert response',
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
      .describe('Network hosts the test function is allowed to contact'),
    allowThirdPartyImports: z
      .boolean()
      .optional()
      .describe('Allow imports from Sombra-approved third-party repositories'),
    timeoutMs: z
      .number()
      .int()
      .positive()
      .optional()
      .describe('Maximum test runtime in milliseconds'),
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
      'Test Custom Function code for DSR or GENERAL. After upsert, pass only { id } (omit code) ' +
      'to execute the saved version. DSR stored runs bind Activity. The tested badge is persisted ' +
      'on save like the dashboard (testPayloads on upsert, or a draft upsert after a passing test). ' +
      'Pass code to trial unsaved plaintext; DSR unsaved trials need dataSiloId from upsert. Omit ' +
      'payload unless you need a specific body. Responses include passed, exitCode, logs, error, ' +
      'and timeMs.',
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
