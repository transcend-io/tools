import {
  createToolResult,
  defineTool,
  getElicitContext,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

export const DocsConfirmDemoSchema = z.object({
  label: z
    .string()
    .default('demo resource')
    .describe('Human-readable label shown in the confirmation prompt (not deleted for real).'),
});
export type DocsConfirmDemoInput = z.infer<typeof DocsConfirmDemoSchema>;

/**
 * Temporary elicitation smoke-test tool for hosts like Claude Desktop.
 * Does not call Transcend APIs; only pauses mid-call for a confirm form.
 */
export function createDocsConfirmDemoTool(_clients?: ToolClients) {
  return defineTool({
    name: 'docs_confirm_demo',
    description:
      'DEMO ONLY: Ask the user to confirm a fake destructive action via MCP form elicitation. ' +
      'No data is deleted. Use this to verify the host supports mid-tool confirmation dialogs.',
    category: 'Documentation',
    readOnly: false,
    requireAuth: false,
    confirmationHint: 'Demo confirmation only — nothing is permanently deleted',
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    zodSchema: DocsConfirmDemoSchema,
    handler: async ({ label }) => {
      const elicit = getElicitContext();
      if (!elicit?.supportsFormElicitation) {
        return createToolResult(
          false,
          undefined,
          'Host does not support form elicitation. Claude Desktop / Cursor must advertise capabilities.elicitation.form.',
          { code: 'ELICITATION_UNSUPPORTED', retryable: false },
        );
      }

      const result = await elicit.elicitInput({
        mode: 'form',
        message: `DEMO: Permanently delete "${label}"? (Nothing is actually deleted — this only tests confirmation UX.)`,
        requestedSchema: {
          type: 'object',
          properties: {
            confirm: {
              type: 'boolean',
              title: 'Yes, delete it',
              description: 'Check this box to pretend to approve the deletion',
            },
          },
          required: ['confirm'],
        },
      });

      switch (result.action) {
        case 'accept':
          if (result.content?.confirm !== true) {
            return createToolResult(true, {
              demo: true,
              executed: false,
              reason: 'confirm_unchecked',
              label,
            });
          }
          return createToolResult(true, {
            demo: true,
            executed: true,
            label,
            note: 'Demo only — no remote delete was performed.',
          });
        case 'decline':
          return createToolResult(true, {
            demo: true,
            executed: false,
            reason: 'declined',
            label,
          });
        case 'cancel':
          return createToolResult(true, {
            demo: true,
            executed: false,
            reason: 'cancelled',
            label,
          });
        default:
          return createToolResult(true, {
            demo: true,
            executed: false,
            reason: 'unknown',
            label,
          });
      }
    },
  });
}
