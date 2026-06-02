import {
  TranscendGraphQLBase,
  type EmailTemplate,
  type ListOptions,
  type PaginatedResponse,
  type Workflow,
  type WorkflowConfig,
} from '@transcend-io/mcp-server-base';

import { graphql } from './__generated__/gql.js';

const ListWorkflowsDoc = graphql(/* GraphQL */ `
  query WorkflowsList($first: Int) {
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
`);

// `updateWorkflowConfig` returns only `{ success, clientMutationId }` per the
// schema -- the previous selection requested a `workflowConfig` field that
// never existed and would have errored at runtime if Transcend's API had
// stricter validation. We split into a mutation + follow-up read so callers
// still get a fully-shaped WorkflowConfig back.
const UpdateWorkflowConfigDoc = graphql(/* GraphQL */ `
  mutation WorkflowsUpdateConfig($input: UpdateWorkflowConfigInput!) {
    updateWorkflowConfig(input: $input) {
      success
    }
  }
`);

// Note: WorkflowConfig has no `showInPrivacyCenter` field (and the input type
// has no corresponding setter). The MCP tool used to advertise this option,
// but it was a no-op against the schema -- removed from the surface area.
const ReadWorkflowConfigDoc = graphql(/* GraphQL */ `
  query WorkflowsReadConfig($input: WorkflowConfigInput!) {
    workflowConfig(input: $input) {
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
      }
    }
  }
`);

const ListEmailTemplatesDoc = graphql(/* GraphQL */ `
  query WorkflowsListTemplates($first: Int, $offset: Int) {
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
`);

export class WorkflowsMixin extends TranscendGraphQLBase {
  async listWorkflows(options?: ListOptions): Promise<PaginatedResponse<Workflow>> {
    const data = await this.makeRequest(ListWorkflowsDoc, {
      first: Math.min(options?.first ?? 50, 100),
    });
    return {
      nodes: data.workflows.nodes.map((w) => ({
        id: w.id,
        title: { defaultMessage: w.title.defaultMessage },
      })),
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
    },
  ): Promise<WorkflowConfig> {
    await this.makeRequest(UpdateWorkflowConfigDoc, {
      input: { workflowConfigId, ...updates },
    });
    const data = await this.makeRequest(ReadWorkflowConfigDoc, {
      input: { id: workflowConfigId },
    });
    const wc = data.workflowConfig.workflowConfig;
    return {
      id: wc.id,
      title: wc.title.defaultMessage,
      subtitle: wc.subtitle?.defaultMessage ?? '',
      description: wc.description?.defaultMessage ?? '',
    };
  }

  async listEmailTemplates(options?: ListOptions): Promise<PaginatedResponse<EmailTemplate>> {
    const data = await this.makeRequest(ListEmailTemplatesDoc, {
      first: Math.min(options?.first ?? 50, 100),
      offset: options?.offset ?? 0,
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
