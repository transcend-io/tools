import { describe, expect, it } from 'vitest';

import {
  McpClientCapability,
  McpHostClient,
  type ClientCapabilityReport,
} from '../src/capabilities/types.js';
import {
  assertElicitFormSchema,
  defineToolWithCapabilities,
  expandToolsForClient,
  isCapabilityAwareTool,
  resolveToolVariant,
  type ElicitFormSchema,
} from '../src/tools/define-tool-with-capabilities.js';
import { defineTool, isVisibleToModel, type ToolDefinition } from '../src/tools/types.js';
import { defineUiResource } from '../src/tools/ui-resource.js';
import { z } from '../src/validation/index.js';

const VIEW = defineUiResource({
  uri: 'ui://test/view',
  name: 'Test view',
  html: '<!DOCTYPE html><html><body>hi</body></html>',
});

const ELICIT_SCHEMA: ElicitFormSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', description: 'Name to greet in the response.' },
  },
};

const SCHEMA = z.object({
  name: z.string().optional().describe('Name to greet in the response.'),
});

function reportFor(...capabilities: McpClientCapability[]): ClientCapabilityReport {
  return { capabilities: new Set(capabilities), host: McpHostClient.Unknown };
}

function buildTool(): ReturnType<typeof defineToolWithCapabilities> {
  return defineToolWithCapabilities({
    name: 'test_greet',
    description: 'Greet someone, adapting to the host capabilities.',
    category: 'test',
    readOnly: true,
    requireAuth: false,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: SCHEMA,
    handler: async () => 'baseline',
    variants: {
      [McpClientCapability.Elicitation]: {
        elicitMessage: 'Who should this greeting be addressed to?',
        elicitSchema: ELICIT_SCHEMA,
        handler: async () => 'elicitation',
      },
      [McpClientCapability.McpApp]: {
        resource: VIEW,
        handler: async () => 'mcp-app',
        appOnlyTools: [
          defineTool({
            name: 'test_greet_refresh',
            description: 'Refresh the greeting for the test_greet view.',
            category: 'test',
            readOnly: true,
            requireAuth: false,
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
            zodSchema: SCHEMA,
            handler: async () => 'refresh',
          }),
        ],
      },
    },
  });
}

describe('defineToolWithCapabilities', () => {
  it('produces something the rest of the server treats as a plain tool', () => {
    const tool = buildTool();
    expect(tool.name).toBe('test_greet');
    expect(isCapabilityAwareTool(tool)).toBe(true);
    expect(isVisibleToModel(tool)).toBe(true);
  });

  it('still enforces the baseline description contract', () => {
    expect(() =>
      defineToolWithCapabilities({
        name: 'test_undocumented',
        description: 'A tool whose input field has no description.',
        category: 'test',
        readOnly: true,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
        zodSchema: z.object({ name: z.string() }),
        handler: async () => 'x',
        variants: {},
      }),
    ).toThrow(/\.describe\(\)/);
  });

  it('rejects an elicitation variant with an empty message', () => {
    expect(() =>
      defineToolWithCapabilities({
        name: 'test_blank_message',
        description: 'A tool with a blank elicitation message.',
        category: 'test',
        readOnly: true,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
        zodSchema: SCHEMA,
        handler: async () => 'x',
        variants: {
          [McpClientCapability.Elicitation]: {
            elicitMessage: '  ',
            elicitSchema: ELICIT_SCHEMA,
            handler: async () => 'x',
          },
        },
      }),
    ).toThrow(/empty message/);
  });

  it('rejects an app-only tool with under-documented inputs', () => {
    expect(() =>
      defineToolWithCapabilities({
        name: 'test_bad_companion',
        description: 'A tool whose companion has an undocumented input.',
        category: 'test',
        readOnly: true,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
        zodSchema: SCHEMA,
        handler: async () => 'x',
        variants: {
          [McpClientCapability.McpApp]: {
            resource: VIEW,
            handler: async () => 'x',
            appOnlyTools: [
              {
                name: 'test_bad_companion_refresh',
                description: 'Companion with an undocumented input.',
                category: 'test',
                readOnly: true,
                annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
                zodSchema: z.object({ name: z.string() }),
                handler: async () => 'x',
              },
            ],
          },
        },
      }),
    ).toThrow(/app-only tool/);
  });
});

describe('assertElicitFormSchema', () => {
  it('accepts a flat primitives-only schema', () => {
    expect(() => assertElicitFormSchema('t', ELICIT_SCHEMA)).not.toThrow();
  });

  it('rejects a nested object, which hosts cannot render', () => {
    const nested = {
      type: 'object',
      properties: {
        address: {
          type: 'object',
          description: 'Postal address of the subject.',
          properties: { city: { type: 'string', description: 'City name for the address.' } },
        },
      },
    } as unknown as ElicitFormSchema;
    expect(() => assertElicitFormSchema('t', nested)).toThrow(/not a supported primitive/);
  });

  it('rejects a schema with no properties', () => {
    const empty = { type: 'object', properties: {} } as ElicitFormSchema;
    expect(() => assertElicitFormSchema('t', empty)).toThrow(/no properties/);
  });

  it('rejects a field with no description, since that is the form label', () => {
    const undescribed = {
      type: 'object',
      properties: { name: { type: 'string' } },
    } as unknown as ElicitFormSchema;
    expect(() => assertElicitFormSchema('t', undescribed)).toThrow(/no description/);
  });

  it('rejects a required field that is never defined', () => {
    const dangling = {
      type: 'object',
      properties: { name: { type: 'string', description: 'Name to greet in the response.' } },
      required: ['nickname'],
    } as ElicitFormSchema;
    expect(() => assertElicitFormSchema('t', dangling)).toThrow(/required but never/);
  });
});

describe('resolveToolVariant', () => {
  it('returns a plain tool unchanged', async () => {
    const plain: ToolDefinition = {
      name: 'plain',
      description: 'A plain tool with no variants.',
      category: 'test',
      readOnly: true,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      zodSchema: z.object({}),
      handler: async () => 'plain',
    };
    expect(resolveToolVariant(plain, reportFor(McpClientCapability.McpApp))).toBe(plain);
  });

  it('falls back to the baseline when the host declares nothing', async () => {
    const resolved = resolveToolVariant(buildTool(), reportFor());
    await expect(resolved.handler({})).resolves.toBe('baseline');
    expect(resolved.ui).toBeUndefined();
  });

  it('uses the elicitation variant when only elicitation is supported', async () => {
    const resolved = resolveToolVariant(buildTool(), reportFor(McpClientCapability.Elicitation));
    await expect(resolved.handler({})).resolves.toBe('elicitation');
    expect(resolved.ui).toBeUndefined();
  });

  it('uses the MCP App variant and binds the view when MCP Apps are supported', async () => {
    const resolved = resolveToolVariant(buildTool(), reportFor(McpClientCapability.McpApp));
    await expect(resolved.handler({})).resolves.toBe('mcp-app');
    expect(resolved.ui?.resource.uri).toBe('ui://test/view');
  });

  it('prefers the MCP App variant when both are supported', async () => {
    const resolved = resolveToolVariant(
      buildTool(),
      reportFor(McpClientCapability.Elicitation, McpClientCapability.McpApp),
    );
    await expect(resolved.handler({})).resolves.toBe('mcp-app');
  });

  it('drops the variants map so downstream code sees an ordinary tool', () => {
    const resolved = resolveToolVariant(buildTool(), reportFor(McpClientCapability.McpApp));
    expect(isCapabilityAwareTool(resolved)).toBe(false);
  });
});

describe('expandToolsForClient', () => {
  it('emits only the baseline for a host with no capabilities', () => {
    const expanded = expandToolsForClient([buildTool()], reportFor());
    expect(expanded.map((tool) => tool.name)).toEqual(['test_greet']);
  });

  it('emits app-only companions alongside the MCP App variant', () => {
    const expanded = expandToolsForClient([buildTool()], reportFor(McpClientCapability.McpApp));
    expect(expanded.map((tool) => tool.name)).toEqual(['test_greet', 'test_greet_refresh']);

    const companion = expanded.find((tool) => tool.name === 'test_greet_refresh')!;
    expect(companion.visibility).toEqual(['app']);
    expect(isVisibleToModel(companion)).toBe(false);
  });

  it('forces companion visibility to app even when the author set it wrongly', () => {
    const tool = defineToolWithCapabilities({
      name: 'test_leaky',
      description: 'A tool whose companion wrongly claims model visibility.',
      category: 'test',
      readOnly: true,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      zodSchema: SCHEMA,
      handler: async () => 'baseline',
      variants: {
        [McpClientCapability.McpApp]: {
          resource: VIEW,
          handler: async () => 'mcp-app',
          appOnlyTools: [
            {
              name: 'test_leaky_refresh',
              description: 'Companion that should never reach the model.',
              category: 'test',
              readOnly: true,
              visibility: ['model', 'app'],
              annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
              zodSchema: SCHEMA,
              handler: async () => 'refresh',
            },
          ],
        },
      },
    });

    const companion = expandToolsForClient([tool], reportFor(McpClientCapability.McpApp)).find(
      (candidate) => candidate.name === 'test_leaky_refresh',
    )!;
    expect(companion.visibility).toEqual(['app']);
  });

  it('keeps the superseded form flow reachable by the view when both are supported', async () => {
    const expanded = expandToolsForClient(
      [buildTool()],
      reportFor(McpClientCapability.Elicitation, McpClientCapability.McpApp),
    );
    expect(expanded.map((tool) => tool.name)).toEqual([
      'test_greet',
      'test_greet_refresh',
      'test_greet_form',
    ]);

    const form = expanded.find((tool) => tool.name === 'test_greet_form')!;
    expect(form.visibility).toEqual(['app']);
    expect(form.ui).toBeUndefined();
    await expect(form.handler({})).resolves.toBe('elicitation');
  });

  it('does not emit a form sibling when the host lacks MCP Apps', () => {
    const expanded = expandToolsForClient(
      [buildTool()],
      reportFor(McpClientCapability.Elicitation),
    );
    expect(expanded.map((tool) => tool.name)).toEqual(['test_greet']);
  });
});
