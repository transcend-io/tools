import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

// Inlined as a string by tsdown's `.md` text loader so the guide ships inside
// `dist` with no runtime file read.
import DASHBOARDS_GUIDE from '../skills/dashboards.md';

/** Guides this tool can return, keyed by the `topic` argument. */
const GUIDES: Record<string, string> = {
  dashboards: DASHBOARDS_GUIDE,
};

export const UiGuideSchema = z.object({
  topic: z
    .enum(['dashboards'])
    .describe("Guide to read. 'dashboards' covers building a dashboard with ui_render."),
});
export type UiGuideInput = z.infer<typeof UiGuideSchema>;

/**
 * Serves the dashboard-building guide to the host's model.
 *
 * Delivered as a tool rather than an MCP resource because hosts surface
 * resources to the user for manual attachment, not to the model — a resource
 * the model never reads cannot steer it. Tools appear in every host's tool list,
 * and the umbrella server's `instructions` point here.
 */
export function createUiGuideTool(_clients?: ToolClients) {
  return defineTool({
    name: 'ui_guide',
    description:
      'Read the guide for building Transcend dashboards before calling ui_render. ' +
      'Call this whenever the user asks for a dashboard, overview, summary, breakdown, or ' +
      'report of Transcend data (consent activity, opt-ins/opt-outs, cookie or data-flow ' +
      'triage). It explains which data tools to call, how to map their results onto the ' +
      'ui_render component catalog, and the value formats that are easy to get wrong. ' +
      'Do not hand-build a dashboard in HTML, React, Python, or a markdown table — ui_render ' +
      'renders one from Transcend’s design system in about a second.',
    category: 'UI',
    readOnly: true,
    requireAuth: false,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: UiGuideSchema,
    handler: async ({ topic }) => createToolResult(true, { topic, markdown: GUIDES[topic] }),
  });
}
