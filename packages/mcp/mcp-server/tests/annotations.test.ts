import { getAdminTools } from '@transcend-io/mcp-server-admin';
import { getAssessmentTools } from '@transcend-io/mcp-server-assessments';
import { getConsentTools } from '@transcend-io/mcp-server-consent';
import type { ToolClients } from '@transcend-io/mcp-server-core';
import { getDiscoveryTools } from '@transcend-io/mcp-server-discovery';
import { getDSRTools } from '@transcend-io/mcp-server-dsr';
import { getInventoryTools } from '@transcend-io/mcp-server-inventory';
import { getPreferenceTools } from '@transcend-io/mcp-server-preferences';
import { getWorkflowTools } from '@transcend-io/mcp-server-workflows';
import { describe, it, expect, vi } from 'vitest';

import { EXPECTED_UMBRELLA_TOOL_COUNT } from './umbrella-tool-count.js';

const stubFn = () => vi.fn();

const mockClients: ToolClients = {
  rest: new Proxy({} as ToolClients['rest'], { get: stubFn }),
  graphql: new Proxy({} as ToolClients['graphql'], { get: stubFn }),
};

const allTools = [
  ...getDSRTools(mockClients),
  ...getConsentTools(mockClients),
  ...getPreferenceTools(mockClients),
  ...getInventoryTools(mockClients),
  ...getDiscoveryTools(mockClients),
  ...getAssessmentTools(mockClients),
  ...getWorkflowTools(mockClients),
  ...getAdminTools(mockClients),
];

const toolByName = (name: string) => allTools.find((t) => t.name === name)!;

describe('MCP Tool Annotations', () => {
  it('registers all umbrella tools (deduped like ToolRegistry)', () => {
    expect(allTools.length).toBe(EXPECTED_UMBRELLA_TOOL_COUNT);
  });

  it('every tool has annotations with readOnlyHint, destructiveHint, and idempotentHint', () => {
    for (const tool of allTools) {
      expect(tool.annotations, `${tool.name} missing annotations`).toBeDefined();
      expect(
        typeof tool.annotations.readOnlyHint,
        `${tool.name}.readOnlyHint should be boolean`,
      ).toBe('boolean');
      expect(
        typeof tool.annotations.destructiveHint,
        `${tool.name}.destructiveHint should be boolean`,
      ).toBe('boolean');
      expect(
        typeof tool.annotations.idempotentHint,
        `${tool.name}.idempotentHint should be boolean`,
      ).toBe('boolean');
    }
  });

  it('readOnlyHint matches the readOnly field on every tool', () => {
    for (const tool of allTools) {
      expect(
        tool.annotations.readOnlyHint,
        `${tool.name}: readOnlyHint should match readOnly`,
      ).toBe(tool.readOnly);
    }
  });

  describe('read-only tools have correct annotations', () => {
    const readOnlyTools = allTools.filter((t) => t.readOnly);

    it('all read-only tools are non-destructive and idempotent', () => {
      for (const tool of readOnlyTools) {
        expect(tool.annotations.destructiveHint, `${tool.name}`).toBe(false);
        expect(tool.annotations.idempotentHint, `${tool.name}`).toBe(true);
      }
    });
  });

  describe('destructive tools are annotated correctly', () => {
    const expectedDestructive = [
      'dsr_cancel',
      'admin_create_api_key',
      'inventory_create_data_silo',
      'preferences_delete',
      'preferences_delete_identifiers',
      'assessments_submit_response',
    ];

    it.each(expectedDestructive)('%s has destructiveHint: true', (name) => {
      const tool = toolByName(name);
      expect(tool.annotations.destructiveHint).toBe(true);
      expect(tool.annotations.readOnlyHint).toBe(false);
    });

    it('no read-only tool is marked destructive', () => {
      const badTools = allTools.filter(
        (t) => t.annotations.readOnlyHint && t.annotations.destructiveHint,
      );
      expect(badTools.map((t) => t.name)).toEqual([]);
    });
  });

  describe('idempotent mutative tools are annotated correctly', () => {
    const expectedIdempotentMutative = [
      'workflows_update_config',
      'consent_set_preferences',
      'preferences_upsert',
      'preferences_update_identifiers',
      'inventory_update_data_silo',
      'assessments_update',
      'assessments_update_assignees',
      'assessments_answer_question',
      'dsr_respond_erasure',
    ];

    it.each(expectedIdempotentMutative)(
      '%s has idempotentHint: true and readOnlyHint: false',
      (name) => {
        const tool = toolByName(name);
        expect(tool.annotations.idempotentHint).toBe(true);
        expect(tool.annotations.readOnlyHint).toBe(false);
      },
    );
  });
});
