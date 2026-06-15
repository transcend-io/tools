import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { McpAppResource } from '@transcend-io/mcp-server-base';

export const ASSESSMENT_CREATE_FORM_RESOURCE_URI = 'ui://transcend/assessments/create-form';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

export function createAssessmentCreateFormResource(): McpAppResource {
  return {
    uri: ASSESSMENT_CREATE_FORM_RESOURCE_URI,
    name: 'Assessment Create Form',
    description:
      'Confirm title, assessment group, and assignee before a new assessment is created.',
    loadHtml: async () => {
      const htmlPath = path.join(moduleDir, 'static', 'mcp-app.html');
      return readFile(htmlPath, 'utf-8');
    },
  };
}
