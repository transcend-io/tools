import type { ToolDefinition, ToolClients } from '@transcend-io/mcp-server-base';

import { createAssessmentsAddSectionTool } from './assessments_add_section.js';
import { createAssessmentsAnswerQuestionTool } from './assessments_answer_question.js';
import { createAssessmentsCreateTool } from './assessments_create.js';
import { createAssessmentsCreateGroupTool } from './assessments_create_group.js';
import { createAssessmentsCreateTemplateTool } from './assessments_create_template.js';
import { createAssessmentsExportTemplateTool } from './assessments_export_template.js';
import { createAssessmentsGetTool } from './assessments_get.js';
import { createAssessmentsListTool } from './assessments_list.js';
import { createAssessmentsListGroupsTool } from './assessments_list_groups.js';
import { createAssessmentsListTemplatesTool } from './assessments_list_templates.js';
import { createAssessmentsPrefillTool } from './assessments_prefill.js';
import { createAssessmentsSubmitResponseTool } from './assessments_submit_response.js';
import { createAssessmentsUpdateTool } from './assessments_update.js';
import { createAssessmentsUpdateAssigneesTool } from './assessments_update_assignees.js';

export function getAssessmentTools(clients: ToolClients): ToolDefinition[] {
  return [
    createAssessmentsListTool(clients),
    createAssessmentsGetTool(clients),
    createAssessmentsCreateTool(clients),
    createAssessmentsCreateGroupTool(clients),
    createAssessmentsListGroupsTool(clients),
    createAssessmentsUpdateTool(clients),
    createAssessmentsListTemplatesTool(clients),
    createAssessmentsUpdateAssigneesTool(clients),
    createAssessmentsAnswerQuestionTool(clients),
    createAssessmentsSubmitResponseTool(clients),
    createAssessmentsCreateTemplateTool(clients),
    createAssessmentsAddSectionTool(clients),
    createAssessmentsExportTemplateTool(clients),
    createAssessmentsPrefillTool(clients),
  ];
}
