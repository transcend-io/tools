import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

export const ExampleConsequentialSchema = z.object({
  recordId: z.string().min(1).describe('Identifier of the pretend record to delete.'),
  owner: z.string().optional().describe('Email address of the pretend record owner.'),
});
export type ExampleConsequentialInput = z.infer<typeof ExampleConsequentialSchema>;

/** Demo of the confirmation gate. Deletes nothing. */
export function createExampleConsequentialTool(_clients?: ToolClients) {
  return defineTool({
    name: 'example_consequential',
    description:
      'Pretend to permanently delete a record, after asking the user to confirm. Demonstrates ' +
      'the confirmation gate: a host-rendered form where one is available, an approval token ' +
      'where it is not. Deletes nothing and stores nothing.',
    category: 'Examples',
    readOnly: false,
    requireAuth: false,
    confirmation: {
      hint:
        'Permanently deletes the record. In this example nothing is actually deleted, but a ' +
        'real tool would be past the point of no return here.',
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    zodSchema: ExampleConsequentialSchema,
    handler: async ({ recordId, owner }) =>
      createToolResult(true, {
        deleted: false,
        recordId,
        owner,
        message: `Approved. A real tool would have deleted ${recordId} by now.`,
      }),
  });
}
