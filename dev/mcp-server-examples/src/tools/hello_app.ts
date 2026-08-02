import {
  createToolResult,
  defineTool,
  defineToolWithCapabilities,
  describeCapabilities,
  getMcpSession,
  McpClientCapability,
  McpHostClient,
  requestElicitation,
  z,
  type ElicitFormSchema,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import { HELLO_APP_RESOURCE } from '../apps/hello.js';

/** Prompt shown above the elicitation form. */
const HELLO_ELICIT_MESSAGE = 'Who should this greeting be addressed to?';

/**
 * Fields the host collects when it supports elicitation. Flat and primitives-only
 * because the spec allows nothing else here.
 */
const HELLO_ELICIT_SCHEMA: ElicitFormSchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      title: 'Name',
      description: 'Name to greet in the response.',
    },
  },
};

export const ExampleHelloAppSchema = z.object({
  name: z
    .string()
    .optional()
    .describe('Name to greet in the response. Defaults to a generic greeting when omitted.'),
});
export type ExampleHelloAppInput = z.infer<typeof ExampleHelloAppSchema>;

/** Payload shared by all three variants so the text fallback matches the view. */
function helloPayload(name: string | undefined): unknown {
  const session = getMcpSession();
  return createToolResult(true, {
    greeting: `Hello, ${name?.trim() || 'world'}!`,
    host: session?.client.host ?? McpHostClient.Unknown,
    capabilities: session ? describeCapabilities(session.client) : [],
    timestamp: new Date().toISOString(),
  });
}

/**
 * Companion tool that exists only so the view can refresh itself without going
 * back through the conversation. Never listed to the model.
 */
function createHelloRefreshTool() {
  return defineTool({
    name: 'example_hello_app_refresh',
    description: 'Re-read the greeting payload for the example_hello_app view.',
    category: 'Examples',
    readOnly: true,
    requireAuth: false,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ExampleHelloAppSchema,
    handler: async ({ name }) => helloPayload(name),
  });
}

/**
 * Reference implementation of the capability layer.
 *
 * The same registration serves three different experiences: a plain text
 * greeting on a host with no relevant capabilities, a host-rendered form on one
 * that supports elicitation, and an interactive view on one that supports MCP
 * Apps. Useful on its own as a smoke test that a host's render path works, and
 * as the worked example for adding variants to a real tool.
 */
export function createExampleHelloAppTool(_clients?: ToolClients) {
  return defineToolWithCapabilities({
    name: 'example_hello_app',
    description:
      'Return a greeting that demonstrates MCP client capability negotiation. ' +
      'Renders as an interactive view on hosts that support MCP Apps, prompts for a ' +
      'name on hosts that support elicitation, and returns plain text everywhere else.',
    category: 'Examples',
    readOnly: true,
    requireAuth: false,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ExampleHelloAppSchema,
    handler: async ({ name }) => helloPayload(name),
    variants: {
      [McpClientCapability.Elicitation]: {
        elicitMessage: HELLO_ELICIT_MESSAGE,
        elicitSchema: HELLO_ELICIT_SCHEMA,
        handler: async ({ name }) => {
          // Only ask when the caller left it out; re-prompting for an argument the
          // agent already supplied is a needless interruption.
          if (name?.trim()) return helloPayload(name);

          const elicited = await requestElicitation(HELLO_ELICIT_MESSAGE, HELLO_ELICIT_SCHEMA);

          const answered =
            elicited?.action === 'accept' && typeof elicited.content?.name === 'string'
              ? elicited.content.name
              : undefined;
          return helloPayload(answered);
        },
      },
      [McpClientCapability.McpApp]: {
        resource: HELLO_APP_RESOURCE,
        handler: async ({ name }) => helloPayload(name),
        appOnlyTools: [createHelloRefreshTool()],
      },
    },
  });
}
