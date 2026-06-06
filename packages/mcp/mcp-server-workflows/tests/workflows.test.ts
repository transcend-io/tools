import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getWorkflowTools } from '../src/tools.js';

const EXPECTED_TOOL_NAMES = [
  'workflows_list',
  'workflows_update_config',
  'workflows_list_email_templates',
] as const;

describe('Workflows Tools', () => {
  let mockGraphql: {
    listWorkflows: ReturnType<typeof vi.fn>;
    updateWorkflowConfig: ReturnType<typeof vi.fn>;
    listEmailTemplates: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockGraphql = {
      listWorkflows: vi.fn(),
      updateWorkflowConfig: vi.fn(),
      listEmailTemplates: vi.fn(),
    };
  });

  const getTools = () =>
    getWorkflowTools({
      rest: {} as never,
      graphql: mockGraphql as never,
      dashboardUrl: 'https://app.transcend.io',
    });

  it('registers exactly 3 tools with expected names', () => {
    const tools = getTools();
    expect(tools).toHaveLength(3);
    expect(tools.map((t) => t.name)).toEqual([...EXPECTED_TOOL_NAMES]);
  });

  describe('workflows_update_config', () => {
    it('zodSchema rejects input when workflow_config_id is missing', () => {
      const tools = getTools();
      const tool = tools.find((t) => t.name === 'workflows_update_config')!;

      const result = tool.zodSchema.safeParse({});

      expect(result.success).toBe(false);
      expect((result as any).error.issues[0].path).toEqual(['workflow_config_id']);
    });

    it('updates workflow config on success', async () => {
      const config = {
        id: 'wf-1',
        title: { defaultMessage: 'Updated' },
        subtitle: { defaultMessage: '' },
        description: { defaultMessage: '' },
        showInPrivacyCenter: true,
      };
      mockGraphql.updateWorkflowConfig.mockResolvedValue(config);

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'workflows_update_config')!;

      const result = await tool.handler({
        workflow_config_id: 'wf-1',
        title: 'Updated',
      });

      expect(result).toMatchObject({ success: true });
      expect(mockGraphql.updateWorkflowConfig).toHaveBeenCalledWith('wf-1', { title: 'Updated' });
    });
  });

  describe('workflows_list', () => {
    it('returns list on success', async () => {
      const nodes = [{ id: 'w1', title: { defaultMessage: 'Erasure' } }];
      mockGraphql.listWorkflows.mockResolvedValue({
        nodes,
        totalCount: 1,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      });

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'workflows_list')!;

      const result = await tool.handler({});

      expect(result).toMatchObject({ success: true, data: nodes, totalCount: 1 });
    });

    it('throws when client throws', async () => {
      mockGraphql.listWorkflows.mockRejectedValue(new Error('API error'));

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'workflows_list')!;

      await expect(tool.handler({})).rejects.toThrow('API error');
    });
  });
});
