import { randomUUID } from 'node:crypto';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { toJsonSchemaCompat } from '@modelcontextprotocol/sdk/server/zod-json-schema-compat.js';
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { getRequestAuth, requestAuthContext } from '../auth-context.js';
import { ASSUME_CAPABILITIES_ENV_VAR, assumedCapabilitiesFromEnv } from '../capabilities/assume.js';
import { deriveClientCapabilities, describeCapabilities } from '../capabilities/derive.js';
import {
  EMPTY_CAPABILITY_REPORT,
  McpClientCapability,
  type ClientCapabilityReport,
} from '../capabilities/types.js';
import { SimpleLogger } from '../clients/graphql/base.js';
import { getRequestMcpCaller } from '../mcp-caller-context.js';
import { mcpSessionContext } from '../mcp-session-context.js';
import { skipConfirmation } from '../oauth/env.js';
import { ensureLazyOAuthAuth, getLazyOAuthCredentials } from '../oauth/lazy-auth.js';
import type { PromptDefinition } from '../prompts/types.js';
import { toolCallContext } from '../tool-call-context.js';
import { ApprovalTokenStore } from '../tools/approval-tokens.js';
import {
  canObtainApproval,
  ConfirmationPolicy,
  type ConfirmationGate,
} from '../tools/confirmation.js';
import {
  expandToolsForClient,
  isCapabilityAwareTool,
} from '../tools/define-tool-with-capabilities.js';
import { createErrorResult, createToolResult } from '../tools/helpers.js';
import { isVisibleToModel, type ToolDefinition } from '../tools/types.js';
import {
  buildUiResourceMeta,
  MCP_APP_MIME_TYPE,
  readUiResourceHtml,
  type UiResourceDefinition,
} from '../tools/ui-resource.js';

export interface BuildMcpServerOptions {
  /** Server display name */
  name: string;
  /** Server version */
  version: string;
  /** Pre-constructed tool definitions */
  tools: ToolDefinition[];
  /** Optional prompt templates (workflow guidance) registered with prompts/list and prompts/get */
  prompts?: PromptDefinition[];
  /** Optional MCP initialize instructions injected into the client system prompt. */
  instructions?: string;
  /** Required. Controls whether form-less hosts get an approval token (`stdio`) or are refused (`http`). */
  transport: 'stdio' | 'http';
}

/**
 * Settles how this server may obtain approval, before any client connects.
 *
 * stdio has somewhere to hand a token back to, so a host that cannot render a form
 * still has a route. Over HTTP a token would be relayed by the very model the gate
 * is interposing on, leaving elicitation as the only one.
 */
function resolveConfirmationGate(options: BuildMcpServerOptions): ConfirmationGate {
  if (options.transport === 'stdio') {
    return { policy: ConfirmationPolicy.ElicitOrToken, tokens: new ApprovalTokenStore() };
  }
  return { policy: ConfirmationPolicy.ElicitOnly };
}

/**
 * Every UI resource any tool could ever bind to, regardless of which variant a
 * given host resolves to.
 *
 * Collected up front so the `resources` capability can be declared at
 * construction time, before any client has connected. Hosts are also allowed to
 * prefetch a `ui://` resource before calling the tool that references it, so
 * `resources/read` has to answer for all of them, not just the active variant.
 */
function collectUiResources(
  tools: readonly ToolDefinition[],
  logger: SimpleLogger,
): Map<string, UiResourceDefinition> {
  const resources = new Map<string, UiResourceDefinition>();

  const add = (resource: UiResourceDefinition, owner: string): void => {
    const existing = resources.get(resource.uri);
    if (existing && existing !== resource) {
      throw new Error(
        `UI resource uri "${resource.uri}" is declared twice with different definitions ` +
          `(most recently by "${owner}"). Share one definition or give each view its own uri.`,
      );
    }
    resources.set(resource.uri, resource);
  };

  for (const tool of tools) {
    if (tool.ui) add(tool.ui.resource, tool.name);
    if (!isCapabilityAwareTool(tool)) continue;
    const mcpApp = tool.variants[McpClientCapability.McpApp];
    if (mcpApp) add(mcpApp.resource, tool.name);
  }

  if (resources.size > 0) {
    logger.info(`Registered ${resources.size} MCP App UI resources`, {
      uris: [...resources.keys()],
    });
  }
  return resources;
}

/**
 * Serializes the `_meta` a host reads to find a tool's view.
 *
 * Emits both the canonical nested `ui.resourceUri` and the deprecated flat
 * `ui/resourceUri`, because hosts shipped against the earlier draft still look
 * for the flat key and the spec's own compatibility guidance is to send both.
 */
function buildToolMeta(tool: ToolDefinition): Record<string, unknown> | undefined {
  const meta: Record<string, unknown> = {};
  if (tool.ui) {
    const resourceUri = tool.ui.resource.uri;
    meta.ui = {
      resourceUri,
      ...(tool.visibility && { visibility: tool.visibility }),
    };
    meta['ui/resourceUri'] = resourceUri;
  }
  if (tool.requireSombra === true) {
    meta.requireSombra = true;
  }
  return Object.keys(meta).length > 0 ? meta : undefined;
}

/**
 * Creates an MCP {@link Server} with ListTools and CallTool handlers registered
 * from the given tool definitions. Does not connect any transport — the caller
 * is responsible for creating a transport and calling `server.connect(transport)`.
 *
 * Tools built with `defineToolWithCapabilities` are resolved per connection, so
 * the same registration serves a plain text result to one host and an MCP App
 * view to another.
 */
export function buildMcpServer(options: BuildMcpServerOptions): Server {
  const logger = new SimpleLogger();
  const jsonSchemaCache = new Map<string, Record<string, unknown>>();
  const registered: ToolDefinition[] = [];
  const seenNames = new Set<string>();

  for (const tool of options.tools) {
    if (seenNames.has(tool.name)) {
      logger.warn(`Duplicate tool name "${tool.name}" — skipping`);
      continue;
    }
    seenNames.add(tool.name);
    registered.push(tool);
  }

  const uiResources = collectUiResources(registered, logger);

  const promptMap = new Map<string, PromptDefinition>();
  for (const prompt of options.prompts ?? []) {
    if (promptMap.has(prompt.name)) {
      logger.warn(`Duplicate prompt name "${prompt.name}" — skipping`);
      continue;
    }
    promptMap.set(prompt.name, prompt);
  }

  logger.info(`Registered ${registered.length} tools`, { toolCount: registered.length });
  if (promptMap.size > 0) {
    logger.info(`Registered ${promptMap.size} prompts`, { promptCount: promptMap.size });
  }

  const gate = resolveConfirmationGate(options);

  if (skipConfirmation()) {
    logger.warn(
      'MCP_SKIP_CONFIRMATION=1: server confirmation gates are disabled; consequential tools ' +
        'will run without human approval',
    );
  }

  const gated = registered.filter((tool) => tool.confirmation).map((tool) => tool.name);
  if (gated.length > 0) {
    logger.info(`${gated.length} tools require human confirmation`, {
      tools: gated,
      policy: gate.policy,
    });
  }

  // Read once at construction: the value cannot change for a running process,
  // and warning here means it appears in startup output rather than buried in a
  // per-request log.
  const assumed = assumedCapabilitiesFromEnv();
  if (assumed.capabilities.length > 0) {
    logger.warn(
      `${ASSUME_CAPABILITIES_ENV_VAR} is forcing client capabilities on. This is a local ` +
        'debugging aid and must not be set in production.',
      { assumed: assumed.capabilities },
    );
  }
  if (assumed.unknown.length > 0) {
    logger.warn(`${ASSUME_CAPABILITIES_ENV_VAR} contains unrecognized entries, which are ignored`, {
      unknown: assumed.unknown,
    });
  }

  const server = new Server(
    { name: options.name, version: options.version },
    {
      capabilities: {
        tools: {},
        // Only advertise resources when there is something to serve, so servers
        // with no views negotiate exactly as they did before MCP Apps existed.
        ...(uiResources.size > 0 && { resources: {} }),
        // Same for prompts: omit the capability when empty so hosts without
        // prompts continue to negotiate as before.
        ...(promptMap.size > 0 && { prompts: {} }),
      },
      ...(options.instructions ? { instructions: options.instructions } : {}),
    },
  );

  /**
   * Capabilities are fixed for a connection's lifetime. Derived once in
   * `oninitialized` (or lazily if a handler races ahead) and reused by handlers.
   */
  let client: ClientCapabilityReport = EMPTY_CAPABILITY_REPORT;
  let clientResolved = false;

  const resolveClient = (): void => {
    if (clientResolved) return;

    const clientInfo = server.getClientVersion();
    const clientCapabilities = server.getClientCapabilities();
    if (!clientInfo && !clientCapabilities) {
      // Pre-handshake: do not cache.
      return;
    }

    client = deriveClientCapabilities({
      capabilities: clientCapabilities,
      clientInfo,
      callerHeader: getRequestMcpCaller(),
      assumeCapabilities: assumed.capabilities,
    });
    clientResolved = true;
  };

  server.oninitialized = () => {
    resolveClient();
    logger.info('MCP client connected', {
      host: client.host,
      clientName: client.clientInfo?.name,
      clientVersion: client.clientInfo?.version,
      capabilities: describeCapabilities(client),
    });
  };

  /** Tool set for the current client, keyed by name for dispatch. */
  const toolsForClient = (client: ClientCapabilityReport): Map<string, ToolDefinition> => {
    const map = new Map<string, ToolDefinition>();
    for (const tool of expandToolsForClient(registered, client, gate)) {
      if (!map.has(tool.name)) map.set(tool.name, tool);
    }
    return map;
  };

  /**
   * JSON Schema derivation is the expensive part, and a variant can carry a
   * different input schema than its baseline, so cache per tool name plus
   * resolved handler rather than per tool name alone.
   */
  const inputSchemaFor = (tool: ToolDefinition): Record<string, unknown> => {
    const cacheKey = `${tool.name}:${tool.ui?.resource.uri ?? ''}`;
    const cached = jsonSchemaCache.get(cacheKey);
    if (cached) return cached;
    const schema = toJsonSchemaCompat(tool.zodSchema as never) as Record<string, unknown>;
    jsonSchemaCache.set(cacheKey, schema);
    return schema;
  };

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    resolveClient();
    logger.debug('Listing MCP tools', { host: client.host });

    const canApprove = canObtainApproval(gate, client);
    if (!canApprove && gated.length > 0) {
      // A tool missing from the list is otherwise hard to account for later.
      logger.info(
        `Withholding ${gated.length} tools that need a confirmation this client cannot show`,
        { tools: gated, host: client.host },
      );
    }

    const toolList = await mcpSessionContext.run({ client, server }, async () =>
      [...toolsForClient(client).values()]
        .filter((tool) => isVisibleToModel(tool))
        .filter((tool) => canApprove || !tool.confirmation)
        .map((tool) => {
          const meta = buildToolMeta(tool);
          return {
            name: tool.name,
            description: tool.description,
            inputSchema: inputSchemaFor(tool),
            annotations: tool.annotations,
            ...(meta && { _meta: meta }),
          };
        }),
    );

    logger.info(`Returning ${toolList.length} tools`);
    return { tools: toolList };
  });

  if (uiResources.size > 0) {
    server.setRequestHandler(ListResourcesRequestSchema, async () => {
      logger.debug('Listing MCP App UI resources');
      return {
        resources: [...uiResources.values()].map((resource) => ({
          uri: resource.uri,
          name: resource.name,
          mimeType: MCP_APP_MIME_TYPE,
          ...(resource.description && { description: resource.description }),
        })),
      };
    });

    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      const resource = uiResources.get(uri);
      if (!resource) {
        throw new Error(
          `Unknown resource uri "${uri}". This server serves ${uiResources.size} UI ` +
            `resource(s): ${[...uiResources.keys()].join(', ')}.`,
        );
      }

      logger.debug(`Reading UI resource ${uri}`);
      const meta = buildUiResourceMeta(resource);
      return {
        contents: [
          {
            uri: resource.uri,
            mimeType: MCP_APP_MIME_TYPE,
            text: await readUiResourceHtml(resource),
            ...(meta && { _meta: meta }),
          },
        ],
      };
    });
  }

  if (promptMap.size > 0) {
    server.setRequestHandler(ListPromptsRequestSchema, async () => {
      logger.debug('Listing MCP prompts');
      return {
        prompts: [...promptMap.values()].map((prompt) => ({
          name: prompt.name,
          description: prompt.description,
          ...(prompt.arguments && { arguments: prompt.arguments }),
        })),
      };
    });

    server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      logger.info(`Getting prompt: ${name}`);
      const prompt = promptMap.get(name);
      if (!prompt) {
        throw new Error(
          `Unknown prompt "${name}". This server serves ${promptMap.size} prompt(s): ` +
            `${[...promptMap.keys()].join(', ')}.`,
        );
      }
      const messages = await prompt.handler(args ?? {});
      return { description: prompt.description, messages };
    });
  }

  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const { name, arguments: args } = request.params;
    resolveClient();
    logger.info(`Executing tool: ${name}`, { args: Object.keys(args || {}), host: client.host });

    try {
      const tool = toolsForClient(client).get(name);
      if (!tool) {
        throw new Error(`Unknown tool: ${name}`);
      }

      const parseResult = tool.zodSchema.safeParse(args || {});
      if (!parseResult.success) {
        const issues = parseResult.error.issues
          .map(
            (i: { path: PropertyKey[]; message: string }) =>
              `${i.path.join('.') || 'input'}: ${i.message}`,
          )
          .join('; ');
        const errorResult = createToolResult(false, undefined, `Invalid input: ${issues}`, {
          code: 'VALIDATION_ERROR',
          retryable: false,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(errorResult, null, 2) }],
          isError: true,
        };
      }

      const toolRequiresAuth = tool.requireAuth !== false;
      let oauthCredentials: ReturnType<typeof getLazyOAuthCredentials> = null;
      if (toolRequiresAuth) {
        await ensureLazyOAuthAuth(logger);
        oauthCredentials = getLazyOAuthCredentials();
      }

      // The id and signal are what let a confirmation form reach whoever made this
      // call, and be torn down if they give up. See McpSession.request.
      const session = {
        client,
        server,
        request: { id: extra.requestId, signal: extra.signal },
      };

      const result = await mcpSessionContext.run(session, () =>
        toolCallContext.run({ toolName: name, correlationId: randomUUID() }, () => {
          const execute = () => tool.handler(parseResult.data);
          if (toolRequiresAuth && !getRequestAuth() && oauthCredentials) {
            return requestAuthContext.run(oauthCredentials, execute);
          }
          return execute();
        }),
      );
      logger.debug(`Tool ${name} completed successfully`);

      const meta = buildToolMeta(tool);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        ...(meta && { _meta: meta }),
      };
    } catch (error) {
      logger.error(`Error executing tool ${name}:`, error);
      return {
        content: [{ type: 'text', text: JSON.stringify(createErrorResult(error), null, 2) }],
        isError: true,
      };
    }
  });

  return server;
}
