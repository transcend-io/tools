import { createToolResult, defineTool, type ToolClients, z } from '@transcend-io/mcp-server-base';

export const submitDsrSchema = z.object({
  workflowConfigId: z
    .string()
    .describe(
      'UUID of the published workflow config (Privacy Requests → Workflows, or workflows_list). ' +
        'Request type and subject class are derived from this config — do not pass type/subjectType.',
    ),
  email: z.string().describe('Email address of the data subject'),
  coreIdentifier: z
    .string()
    .optional()
    .describe('Core identifier for the data subject (defaults to email if not provided)'),
  locale: z.string().optional().describe('Locale for communications (e.g., en-US)'),
  isSilent: z.boolean().optional().describe('Whether to suppress email notifications'),
});
export type SubmitDsrInput = z.infer<typeof submitDsrSchema>;

export function createDsrSubmitTool(clients: ToolClients) {
  const { rest } = clients;

  return defineTool({
    name: 'dsr_submit',
    description:
      'Submit a Data Subject Request via customer-ingress REST bulk create ' +
      '(`POST /v1/data-subject-request-bulk`). Call `workflows_list` first and pass a returned ' +
      '`id` as `workflowConfigId` — type and subjectType are derived from that workflow (do not ' +
      'invent them). Sombra attests the subject from the provided email/identifiers. ' +
      'coreIdentifier defaults to email. Returns a minimal summary for each created request. ' +
      'Requires Sombra (SOMBRA_URL or organization customerUrl).',
    category: 'DSR Automation',
    readOnly: false,
    confirmation: {
      hint:
        'Files a live data subject request against a workflow config. ERASURE and opt-out ' +
        'workflows start irreversible deletion across connected systems, and the data subject ' +
        'is emailed unless isSilent is set. Check workflowConfigId and email in the call ' +
        'arguments before agreeing.',
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    requireSombra: true,
    zodSchema: submitDsrSchema,
    handler: async ({ workflowConfigId, email, coreIdentifier, locale, isSilent }) => {
      const requests = await rest.submitDSR({
        workflowConfigId,
        email,
        coreIdentifier,
        locale,
        isSilent,
      });
      const count = requests.length;
      return createToolResult(true, {
        requests,
        message:
          count === 1
            ? `DSR submitted successfully (${requests[0]?.type ?? 'unknown type'})`
            : `${count} DSRs submitted successfully`,
      });
    },
  });
}
