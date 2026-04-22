import { createToolResult } from '@transcend-io/mcp-server-base';

import type { AssessmentsMixin } from '../graphql.js';

/**
 * Resolves a template_id to an assessment group ID by searching through all groups.
 * Returns either the group ID or an error result.
 */
export async function resolveTemplateToGroupId(
  graphql: AssessmentsMixin,
  templateId: string,
): Promise<{ groupId: string } | { error: ReturnType<typeof createToolResult> }> {
  const groups = await graphql.listAssessmentGroups({ first: 100 });
  const matchingGroups = groups.nodes.filter((g) => g.assessmentFormTemplate?.id === templateId);

  if (matchingGroups.length === 0) {
    return {
      error: createToolResult(
        false,
        undefined,
        `No assessment group found for template_id "${templateId}". Use assessments_list_groups to see available groups.`,
      ),
    };
  }

  if (matchingGroups.length > 1) {
    const ids = matchingGroups.map((g) => g.id).join(', ');
    return {
      error: createToolResult(
        false,
        undefined,
        `Multiple assessment groups found for template_id "${templateId}" (group IDs: ${ids}). ` +
          `Please specify assessment_group_id explicitly. Use assessments_list_groups to find available groups.`,
      ),
    };
  }

  return { groupId: matchingGroups[0]!.id };
}
