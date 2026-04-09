import { createToolResult, defineTool, type ToolClients, z } from '@transcend-io/mcp-server-core';
import { RequestAction } from '@transcend-io/privacy-types';

const RequestTypeEnum = z.nativeEnum(RequestAction);

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
    },
  });
}
