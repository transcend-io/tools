export { getWorkflowTools } from './tools/index.js';
export { WorkflowsMixin } from './graphql.js';

export { ListWorkflowsSchema, type ListWorkflowsInput } from './tools/workflows_list.js';
export {
  ListEmailTemplatesSchema,
  type ListEmailTemplatesInput,
} from './tools/workflows_list_email_templates.js';
export {
  UpdateWorkflowConfigSchema,
  type UpdateWorkflowConfigInput,
} from './tools/workflows_update_config.js';
