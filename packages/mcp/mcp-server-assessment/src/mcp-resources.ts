import { createAssessmentCreateFormResource } from '@transcend-io/mcp-app-assessment-create-form';
import type { McpAppResource } from '@transcend-io/mcp-server-base';

export function getAssessmentMcpResources(): McpAppResource[] {
  return [createAssessmentCreateFormResource()];
}
