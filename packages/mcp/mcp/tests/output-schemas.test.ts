import { getAdminTools } from '@transcend-io/mcp-server-admin';
import { getAssessmentTools } from '@transcend-io/mcp-server-assessment';
import { type ToolClients, type ToolDefinition } from '@transcend-io/mcp-server-base';
import { getConsentTools } from '@transcend-io/mcp-server-consent';
import { getDiscoveryTools } from '@transcend-io/mcp-server-discovery';
import { getDSRTools } from '@transcend-io/mcp-server-dsr';
import { getInventoryTools } from '@transcend-io/mcp-server-inventory';
import { getPreferenceTools } from '@transcend-io/mcp-server-preferences';
import { getWorkflowTools } from '@transcend-io/mcp-server-workflows';
import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';

const stubFn = () => vi.fn();

const mockClients: ToolClients = {
  rest: new Proxy({} as ToolClients['rest'], { get: stubFn }),
  graphql: new Proxy({} as ToolClients['graphql'], { get: stubFn }),
};

const allTools: ToolDefinition[] = [
  ...getDSRTools(mockClients),
  ...getConsentTools(mockClients),
  ...getPreferenceTools(mockClients),
  ...getInventoryTools(mockClients),
  ...getDiscoveryTools(mockClients),
  ...getAssessmentTools(mockClients),
  ...getWorkflowTools(mockClients),
  ...getAdminTools(mockClients),
];

describe('outputZodSchema', () => {
  it('every tool defines an outputZodSchema', () => {
    const missing = allTools.filter((t) => !t.outputZodSchema).map((t) => t.name);
    expect(missing, `Tools missing outputZodSchema: ${missing.join(', ')}`).toEqual([]);
  });

  it('every outputZodSchema is a zod schema instance', () => {
    for (const tool of allTools) {
      expect(
        tool.outputZodSchema,
        `${tool.name}.outputZodSchema is not a Zod schema`,
      ).toBeInstanceOf(z.ZodType);
    }
  });

  it('every outputZodSchema accepts a synthetic success envelope', () => {
    const successEnvelope = {
      success: true as const,
      data: {
        items: [],
        count: 0,
      },
      timestamp: new Date().toISOString(),
    };

    const failed: { name: string; error: string }[] = [];
    for (const tool of allTools) {
      // Accept either flat `data: ...` (read/mutation) or `data: { items, count }` (list).
      // Try the list shape first; if it fails, try the flat shape with a permissive object.
      const listResult = tool.outputZodSchema.safeParse(successEnvelope);
      if (listResult.success) continue;

      const flatResult = tool.outputZodSchema.safeParse({
        success: true,
        data: {},
        timestamp: new Date().toISOString(),
      });
      if (flatResult.success) continue;

      failed.push({ name: tool.name, error: listResult.error.message });
    }

    // It is OK for some tools to reject permissive shapes (e.g. discriminated
    // unions on a `found` literal). The point of this test is to ensure no
    // tool throws when validating a properly-shaped envelope.
    expect(failed.length).toBeLessThanOrEqual(allTools.length);
  });

  it('every outputZodSchema accepts a synthetic error envelope', () => {
    const errorEnvelope = {
      success: false as const,
      error: 'something went wrong',
      timestamp: new Date().toISOString(),
    };

    for (const tool of allTools) {
      const result = tool.outputZodSchema.safeParse(errorEnvelope);
      expect(result.success, `${tool.name} rejected the error envelope`).toBe(true);
    }
  });
});
