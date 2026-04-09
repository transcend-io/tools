import { createToolResult, defineTool, type ToolClients, z } from '@transcend-io/mcp-server-core';

const REQUEST_TYPES = [
  'ACCESS',
  'ERASURE',
  'RECTIFICATION',
  'RESTRICTION',
  'SALE_OPT_OUT',
  'SALE_OPT_IN',
  'CONTACT_OPT_OUT',
  'CONTACT_OPT_IN',
  'AUTOMATED_DECISION_MAKING_OPT_OUT',
  'AUTOMATED_DECISION_MAKING_OPT_IN',
  'USE_OF_SENSITIVE_INFORMATION_OPT_OUT',
  'USE_OF_SENSITIVE_INFORMATION_OPT_IN',
  'TRACKING_OPT_OUT',
  'TRACKING_OPT_IN',
  'CUSTOM_OPT_OUT',
  'CUSTOM_OPT_IN',
  'BUSINESS_PURPOSE',
  'PLACE_ON_LEGAL_HOLD',
  'REMOVE_FROM_LEGAL_HOLD',
] as const;

const RequestTypeEnum = z.enum(REQUEST_TYPES);

const submitDsrSchema = z.object({
  type: RequestTypeEnum.describe('Type of DSR request'),
  email: z.string().describe('Email address of the data subject'),
  subjectType: z
    .string()
    .describe(
      'Type of data subject (e.g., customer, employee, prospect). Required by the Transcend API.',
    ),
  coreIdentifier: z
    .string()
    .optional()
    .describe('Core identifier for the data subject (defaults to email if not provided)'),
  name: z.string().optional().describe('Name of the data subject (optional)'),
  locale: z.string().optional().describe('Locale for communications (e.g., en-US)'),
  isSilent: z.boolean().optional().describe('Whether to suppress email notifications'),
});

export function createDsrSubmitTool(clients: ToolClients) {
  const { rest } = clients;

  return defineTool({
    name: 'dsr_submit',
    description:
      'Submit a new Data Subject Request (DSR). Supports ACCESS, ERASURE, RECTIFICATION, and other request types. The coreIdentifier defaults to the email if not provided.',
    category: 'DSR Automation',
    readOnly: false,
    confirmationHint: 'Creates a new data subject request',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    zodSchema: submitDsrSchema,
    handler: async ({ type, email, subjectType, coreIdentifier, name, locale, isSilent }) => {
      try {
        const result = await rest.submitDSR({
          type,
          email,
          subjectType,
          coreIdentifier,
          name,
          locale,
          isSilent,
        });
        return createToolResult(true, {
          request: result,
          message: `DSR of type ${type} submitted successfully`,
        });
      } catch (error) {
        return createToolResult(
          false,
          undefined,
          error instanceof Error ? error.message : String(error),
        );
      }
    },
  });
}
