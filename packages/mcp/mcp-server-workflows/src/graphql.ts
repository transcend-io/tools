import {
  TranscendGraphQLBase,
  type EmailTemplate,
  type ListOptions,
  type PaginatedResponse,
  type Workflow,
  type WorkflowConfig,
} from '@transcend-io/mcp-server-base';

export class WorkflowsMixin extends TranscendGraphQLBase {
  async listWorkflows(options?: ListOptions): Promise<PaginatedResponse<Workflow>> {
    const query = `
      query ListWorkflows($first: Int) {
        workflows(first: $first) {
          nodes {
            id
            title {
              defaultMessage
            }
          }
          totalCount
        }
      }
    `;
    const data = await this.makeRequest<{ workflows: { nodes: Workflow[]; totalCount: number } }>(
      query,
      { first: Math.min(options?.first || 50, 100) },
    );
    return {
      nodes: data.workflows.nodes,
      pageInfo: {
        hasNextPage: data.workflows.nodes.length < data.workflows.totalCount,
        hasPreviousPage: false,
      },
      totalCount: data.workflows.totalCount,
    };
  }

  async updateWorkflowConfig(
    workflowConfigId: string,
    updates: {
      title?: string;
      subtitle?: string;
      description?: string;
      showInPrivacyCenter?: boolean;
    },
  ): Promise<WorkflowConfig> {
    const mutation = `
      mutation UpdateWorkflowConfig($input: UpdateWorkflowConfigInput!) {
        updateWorkflowConfig(input: $input) {
          workflowConfig {
            id
            title {
              defaultMessage
            }
            subtitle {
              defaultMessage
            }
            description {
              defaultMessage
            }
            showInPrivacyCenter
          }
        }
      }
    `;
    const input = { workflowConfigId, ...updates };
    const data = await this.makeRequest<{
      updateWorkflowConfig: {
        workflowConfig: {
          id: string;
          title: { defaultMessage: string } | null;
          subtitle: { defaultMessage: string } | null;
          description: { defaultMessage: string } | null;
          showInPrivacyCenter: boolean;
        };
      };
    }>(mutation, { input });
    const wc = data.updateWorkflowConfig.workflowConfig;
    return {
      id: wc.id,
      title: wc.title?.defaultMessage || '',
      subtitle: wc.subtitle?.defaultMessage || '',
      description: wc.description?.defaultMessage || '',
      showInPrivacyCenter: wc.showInPrivacyCenter,
    };
  }

  async listEmailTemplates(options?: ListOptions): Promise<PaginatedResponse<EmailTemplate>> {
    const query = `
      query ListTemplates($first: Int, $offset: Int) {
        templates(first: $first, offset: $offset) {
          nodes {
            id
            title
            type
            isRequired
          }
          totalCount
        }
      }
    `;
    const data = await this.makeRequest<{
      templates: {
        nodes: Array<{ id: string; title: string; type: string; isRequired: boolean }>;
        totalCount: number;
      };
    }>(query, {
      first: Math.min(options?.first || 50, 100),
      offset: options?.offset || 0,
    });
    const templates: EmailTemplate[] = data.templates.nodes.map((t) => ({
      id: t.id,
      name: t.title,
      subject: '',
      type: t.type,
      locale: '',
      isActive: t.isRequired,
      createdAt: '',
      updatedAt: '',
    }));
    return {
      nodes: templates,
      pageInfo: {
        hasNextPage: templates.length < data.templates.totalCount,
        hasPreviousPage: false,
      },
      totalCount: data.templates.totalCount,
    };
  }
}
