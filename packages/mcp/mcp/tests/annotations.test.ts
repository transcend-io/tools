import { getAdminTools } from '@transcend-io/mcp-server-admin';
import { getAssessmentTools } from '@transcend-io/mcp-server-assessment';
import type { ToolClients } from '@transcend-io/mcp-server-base';
import { getConsentTools } from '@transcend-io/mcp-server-consent';
import { getDiscoveryTools } from '@transcend-io/mcp-server-discovery';
import { getDocsTools } from '@transcend-io/mcp-server-docs';
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
  dashboardUrl: 'https://app.transcend.io',
};

const allTools = [
  ...getDSRTools(mockClients),
  ...getConsentTools(mockClients),
  ...getPreferenceTools(mockClients),
  ...getInventoryTools(mockClients),
  ...getDiscoveryTools(mockClients),
  ...getDocsTools(mockClients),
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
      'admin_create_api_key',
      'assessments_submit_response',
      'consent_bulk_triage',
      'consent_update_cookies',
      'consent_update_data_flows',
      'dsr_cancel',
      'dsr_enrich_identifiers',
      'dsr_submit',
      'dsr_submit_on_behalf',
      'preferences_delete',
      'preferences_delete_identifiers',
      'preferences_update_identifiers',
    ];

    it.each(expectedDestructive)('%s has destructiveHint: true', (name) => {
      const tool = toolByName(name);
      expect(tool.annotations.destructiveHint).toBe(true);
      expect(tool.annotations.readOnlyHint).toBe(false);
    });

    // Exact rather than a lower bound: a tool picking up destructiveHint changes how
    // every host prompts for it, so it should not happen without editing this list.
    it('no other tool is marked destructive', () => {
      const actual = allTools
        .filter((t) => t.annotations.destructiveHint)
        .map((t) => t.name)
        .sort();
      expect(actual).toEqual([...expectedDestructive].sort());
    });

    it('no read-only tool is marked destructive', () => {
      const badTools = allTools.filter(
        (t) => t.annotations.readOnlyHint && t.annotations.destructiveHint,
      );
      expect(badTools.map((t) => t.name)).toEqual([]);
    });
  });

  describe('confirmation-gated tools', () => {
    const expectedGated = [
      'dsr_cancel',
      'dsr_enrich_identifiers',
      'dsr_submit',
      'dsr_submit_on_behalf',
      'preferences_delete',
      'preferences_delete_identifiers',
      'preferences_update_identifiers',
    ];

    // Exact in both directions: adding a gate makes a tool refuse on hosts that
    // cannot ask, and dropping one silently un-guards an irreversible action.
    it('exactly the expected tools require confirmation', () => {
      const actual = allTools
        .filter((t) => t.confirmation)
        .map((t) => t.name)
        .sort();
      expect(actual).toEqual([...expectedGated].sort());
    });

    it.each(expectedGated)('%s has a non-empty confirmation hint', (name) => {
      const tool = toolByName(name);
      expect(tool.confirmation?.hint.trim()).not.toBe('');
    });

    it('every gated tool is also annotated destructive and mutating', () => {
      for (const tool of allTools.filter((t) => t.confirmation)) {
        expect(tool.annotations.destructiveHint, `${tool.name}`).toBe(true);
        expect(tool.annotations.readOnlyHint, `${tool.name}`).toBe(false);
      }
    });
  });

  describe('idempotent mutative tools are annotated correctly', () => {
    const expectedIdempotentMutative = [
      'workflows_update_config',
      'consent_set_preferences',
      'preferences_upsert',
      'preferences_update_identifiers',
      'inventory_update_data_silo',
      'inventory_write_vendor',
      'inventory_write_processing_purpose',
      'inventory_update_or_create_data_point',
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
