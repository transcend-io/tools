import {
  createToolResult,
  z,
  type ToolDefinition,
  type ToolClients,
} from '@transcend-io/mcp-server-core';

import type { AssessmentsMixin } from '../graphql.js';

const CreateGroupSchema = z.object({
  title: z.string(),
  template_id: z.string(),
  description: z.string().optional(),
  reviewer_ids: z.array(z.string()).optional(),
});

export function createAssessmentsCreateGroupTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as AssessmentsMixin;
  return {
    name: 'assessments_create_group',
    description:
      'Create a new assessment group linked to a template. Assessment groups are containers for assessments.',
    category: 'Assessments',
    readOnly: false,
    confirmationHint: 'Creates a new assessment group',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    zodSchema: CreateGroupSchema,
    handler: async (args: z.infer<typeof CreateGroupSchema>) => {
      try {
        const result = await graphql.createAssessmentGroup({
          title: args.title,
          assessmentFormTemplateId: args.template_id,
          description: args.description,
          reviewerIds: args.reviewer_ids,
        });

        return createToolResult(true, {
          assessmentGroup: result,
          message: `Assessment group "${args.title}" created successfully`,
        });
      } catch (error) {
        return createToolResult(
          false,
          undefined,
          error instanceof Error ? error.message : String(error),
        );
      }
    },
  };
}
