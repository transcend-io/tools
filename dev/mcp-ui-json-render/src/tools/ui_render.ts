import {
  createToolResult,
  defineToolWithCapabilities,
  McpClientCapability,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import { RENDER_UI_APP_RESOURCE } from '../apps/json-render.js';
import { UiSpecSchema, type UiSpec, catalog } from '../catalog.js';

export const UiRenderSchema = z.object({
  spec: UiSpecSchema.describe(
    'Flat json-render spec. root is the key of the root element; elements maps ' +
      'keys to { type, props, children? }. Allowed types: Heading, MetricCard, ' +
      'ProgressBar, Grid. Prefer Grid with columns 1 as the page stack, and nested ' +
      'Grids for KPI rows. Pass raw numbers — MetricCard formats them.',
  ),
});
export type UiRenderInput = z.infer<typeof UiRenderSchema>;

/** Flattens a validated spec into readable prose for hosts without MCP Apps. */
function flattenSpec(spec: UiSpec): string {
  const lines: string[] = [];
  const visit = (key: string, depth: number): void => {
    const element = spec.elements[key];
    if (!element) {
      lines.push(`${'  '.repeat(depth)}(missing element: ${key})`);
      return;
    }
    const indent = '  '.repeat(depth);
    switch (element.type) {
      case 'Heading':
        lines.push(`${indent}${element.props.text}`);
        break;
      case 'MetricCard': {
        const { label, value, format, delta, note } = element.props;
        let line = `${indent}${label}: ${value}${format ? ` (${format})` : ''}`;
        if (delta) {
          line += ` — ${delta.direction === 'down' ? '↓' : '↑'} ${delta.value}% ${delta.label}`;
        } else if (note) {
          line += ` — ${note.text}`;
        }
        lines.push(line);
        break;
      }
      case 'ProgressBar': {
        const parts = element.props.segments
          .map((segment) => `${segment.label}=${segment.value}`)
          .join(', ');
        lines.push(`${indent}${element.props.label}: ${parts}`);
        if (element.props.caption) lines.push(`${indent}  ${element.props.caption}`);
        break;
      }
      case 'Grid':
        lines.push(`${indent}[grid ${element.props.columns} cols]`);
        break;
      default:
        break;
    }
    for (const child of element.children ?? []) {
      visit(child, depth + (element.type === 'Grid' ? 1 : 0));
    }
  };
  visit(spec.root, 0);
  return lines.join('\n');
}

/**
 * Payload shared by both variants so the text a host without MCP Apps shows
 * describes the same result the view renders.
 */
function renderPayload(spec: UiSpec): unknown {
  // Catalog validation catches type/prop mismatches the Zod input schema may
  // miss (e.g. unknown component names if the schema is ever loosened).
  const validated = catalog.validate({
    root: spec.root,
    elements: Object.fromEntries(
      Object.entries(spec.elements).map(([key, element]) => [
        key,
        {
          ...element,
          children: element.children ?? [],
          visible: null,
        },
      ]),
    ),
  });

  if (!validated.success) {
    const message = validated.error?.message ?? 'unknown validation error';
    return createToolResult(false, undefined, `Invalid json-render spec: ${message}`);
  }

  return createToolResult(true, {
    spec,
    summary: flattenSpec(spec),
  });
}

/**
 * Renders an agent-authored json-render spec in an MCP App view.
 *
 * The host's model reads the catalog from this tool's input schema, fetches data
 * from other tools, then calls `ui_render` with a composed spec. Calling again
 * replaces the view's held spec (B-lite progressive reveal).
 */
export function createRenderUiTool(_clients?: ToolClients) {
  return defineToolWithCapabilities({
    name: 'ui_render',
    description:
      'Render an interactive dashboard UI (MCP App) from a json-render spec. This is ' +
      'the tool that paints the visual — calling data tools alone will not show a UI, and ' +
      'hand-writing HTML, React, Python, or a markdown table is never an acceptable ' +
      'substitute. Read ui_guide with topic "dashboards" first: it maps Transcend data tools ' +
      'onto this catalog and lists the value formats that are easy to get wrong. Compose ' +
      'Heading, MetricCard, ProgressBar, and Grid into a flat `spec` after fetching real data. ' +
      'Call again to update the view. On hosts without MCP Apps, returns a prose summary.',
    category: 'UI',
    readOnly: true,
    requireAuth: false,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: UiRenderSchema,
    handler: async ({ spec }) => renderPayload(spec),
    variants: {
      [McpClientCapability.McpApp]: {
        resource: RENDER_UI_APP_RESOURCE,
        handler: async ({ spec }) => renderPayload(spec),
      },
    },
  });
}
