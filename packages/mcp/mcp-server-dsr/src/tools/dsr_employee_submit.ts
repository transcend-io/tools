import { createToolResult, defineTool, type ToolClients, z } from '@transcend-io/mcp-server-core';
import { RequestAction } from '@transcend-io/privacy-types';

import type { DSRMixin } from '../graphql.js';

export const RequestTypeEnum = z.nativeEnum(RequestAction);

export const employeeSubmitDsrSchema = z.object({
  type: RequestTypeEnum.describe('Type of DSR request'),
  email: z.string().describe('Email address of the data subject'),
  subjectType: z
    .string()
    .describe('Type of data subject (e.g., customer, employee). Required by the Transcend API.'),
  coreIdentifier: z.string().optional().describe('Core identifier for the data subject (optional)'),
  locale: z.string().optional().describe('Locale for communications (e.g., en-US)'),
  isSilent: z.boolean().optional().describe('Whether to suppress email notifications'),
});
export type EmployeeSubmitDsrInput = z.infer<typeof employeeSubmitDsrSchema>;

export function createDsrEmployeeSubmitTool(clients: ToolClients) {
  const graphql = clients.graphql as DSRMixin;

  return defineTool({
    name: 'dsr_employee_submit',
    description:
      'Submit a Data Subject Request as an employee on behalf of a data subject. Requires subjectType to be specified.',
    category: 'DSR Automation',
    readOnly: false,
    confirmationHint: 'Creates a new data subject request (employee)',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    zodSchema: employeeSubmitDsrSchema,
    handler: async ({ type, email, subjectType, coreIdentifier, locale, isSilent }) => {
      const result = await graphql.employeeMakeDataSubjectRequest({
        type,
        email,
        subjectType,
        coreIdentifier,
        locale,
        isSilent,
      });
      return createToolResult(true, {
        request: result.request,
        clientMutationId: result.clientMutationId,
        message: `Employee DSR of type ${type} submitted successfully`,
      });
    },
  });
}
