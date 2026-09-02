import { describe, it, expect, beforeEach, vi } from 'vitest';

import { getPolicyTools } from '../src/tools/index.js';

const EXPECTED_TOOL_NAMES = ['policy_help', 'policy_status'] as const;

describe('Policy MCP read tools', () => {
  const clients = {
    rest: {} as never,
    graphql: {} as never,
    dashboardUrl: 'https://app.transcend.io',
    transcendApiUrl: 'https://api.transcend.io',
    auth: { type: 'apiKey' as const, apiKey: 'test-key' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers help and status tools', () => {
    const tools = getPolicyTools(clients);
    expect(tools).toHaveLength(2);
    expect(tools.map((tool) => tool.name)).toEqual([...EXPECTED_TOOL_NAMES]);
  });

  describe('policy_help', () => {
    it('returns template list by default', async () => {
      const tool = getPolicyTools(clients).find((entry) => entry.name === 'policy_help')!;
      const result = await tool.handler({});
      expect(result).toMatchObject({
        success: true,
        data: {
          templates: expect.arrayContaining([expect.objectContaining({ id: 'starter' })]),
        },
      });
      expect(result.data).not.toHaveProperty('guide');
    });

    it('returns template files when templateId is set', async () => {
      const tool = getPolicyTools(clients).find((entry) => entry.name === 'policy_help')!;
      const result = await tool.handler({ templateId: 'starter' });
      expect(result).toMatchObject({
        success: true,
        data: {
          templateFiles: {
            files: expect.objectContaining({
              'manifest.json': expect.any(String),
              'policy_engine/decision.rego': expect.any(String),
            }),
          },
        },
      });
      expect(result.data).not.toHaveProperty('guide');
      expect(result.data).not.toHaveProperty('templates');
    });
  });
});
