import { createToolResult, defineTool, type ToolClients, z } from '@transcend-io/mcp-server-base';
import { RequestAction } from '@transcend-io/privacy-types';

import type { DSRMixin } from '../graphql.js';

export const submitDsrOnBehalfSchema = z.object({
  type: z.nativeEnum(RequestAction).describe('Type of DSR request'),
  email: z.string().describe('Email address of the data subject'),
  subjectType: z
    .string()
    .describe('Type of data subject (e.g., customer, employee). Required by the Transcend API.'),
  coreIdentifier: z.string().optional().describe('Core identifier for the data subject (optional)'),
  locale: z.string().optional().describe('Locale for communications (e.g., en-US)'),
  isSilent: z.boolean().optional().describe('Whether to suppress email notifications'),
});
export type SubmitDsrOnBehalfInput = z.infer<typeof submitDsrOnBehalfSchema>;

export function createDsrSubmitOnBehalfTool(clients: ToolClients) {
  const graphql = clients.graphql as DSRMixin;

  return defineTool({
    name: 'dsr_submit_on_behalf',
    description:
      'Submit a Data Subject Request as an admin on behalf of a data subject (admin-dashboard flow). Use dsr_submit when the data subject is submitting their own.',
    category: 'DSR Automation',
    readOnly: false,
    confirmationHint: 'Creates a new data subject request on behalf of a data subject',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    zodSchema: submitDsrOnBehalfSchema,
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
        message: `DSR of type ${type} submitted on behalf of data subject`,
      });
    },
  });
}
