import { getAdminTools } from '@transcend-io/mcp-server-admin';
import { getAssessmentTools } from '@transcend-io/mcp-server-assessment';
import {
  canObtainApproval,
  ConfirmationPolicy,
  createErrorResult,
  EMPTY_CAPABILITY_REPORT,
  expandToolsForClient,
  isVisibleToModel,
  resolveToolVariant,
  shouldRegisterTool,
  SimpleLogger,
  toolInputSchema,
  withConfirmation,
  type ClientCapabilityReport,
  type ConfirmationGate,
  type ToolDefinition,
  type TranscendRestClient,
} from '@transcend-io/mcp-server-base';
import { getConfigTools } from '@transcend-io/mcp-server-config';
import { getConsentTools } from '@transcend-io/mcp-server-consent';
import { getCustomFunctionsTools } from '@transcend-io/mcp-server-custom-functions';
import { getDiscoveryTools } from '@transcend-io/mcp-server-discovery';
import { getDocsTools } from '@transcend-io/mcp-server-docs';
import { getDSRTools } from '@transcend-io/mcp-server-dsr';
import { getInventoryTools } from '@transcend-io/mcp-server-inventory';
import { getPolicyTools, type PolicyToolClients } from '@transcend-io/mcp-server-policy';
import { getPreferenceTools } from '@transcend-io/mcp-server-preferences';
import { getPrivacyCenterTools } from '@transcend-io/mcp-server-privacy-center';
import { getWorkflowTools } from '@transcend-io/mcp-server-workflows';
import { TranscendMcpServer } from '@transcend-io/sdk';

import type { TranscendGraphQLClient } from './graphql-client.js';
import {
  MCP_ALLOWLIST_DOCS,
  resolveMcpServerAllowlist,
  type McpAllowlistEntry,
  type McpServerAllowlist,
} from './mcp-server-allowlist.js';

export interface UmbrellaToolClients extends PolicyToolClients {
  /** REST client for Sombra API */
  rest: TranscendRestClient;
  /** Composed GraphQL client with all domain mixins */
  graphql: TranscendGraphQLClient;
  /** Admin-dashboard base URL used to build deep links */
  dashboardUrl: string;
}

/**
 * Confirmation policy for callers that drive the registry directly.
 *
 * Refuse, because there is no transport here to tell us a person is reachable:
 * embedders call `executeTool` in-process, with no `elicitation/create` channel
 * and nowhere to return an approval token to. The serving paths pick their own
 * policy in `buildMcpServer` from the transport they are on.
 */
const EMBEDDED_GATE: ConfirmationGate = { policy: ConfirmationPolicy.Refuse };

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();
  private jsonSchemaCache: Map<string, Record<string, unknown>> = new Map();
  private clients: UmbrellaToolClients;
  private logger = new SimpleLogger();

  constructor(
    clients: UmbrellaToolClients,
    allowlist: McpServerAllowlist = resolveMcpServerAllowlist(),
  ) {
    this.clients = clients;
    this.registerAllTools(allowlist);
  }

  private registerAllTools(allowlist: McpServerAllowlist): void {
    const maybeRegister = (entry: McpAllowlistEntry, tools: ToolDefinition[]): void => {
      if (!allowlist.has(entry)) return;
      this.registerToolsFromModule(tools);
    };

    const docs = MCP_ALLOWLIST_DOCS;
    maybeRegister(docs, getDocsTools(this.clients));
    maybeRegister(TranscendMcpServer.Dsr, getDSRTools(this.clients));
    maybeRegister(TranscendMcpServer.Consent, getConsentTools(this.clients));
    maybeRegister(TranscendMcpServer.CustomFunctions, getCustomFunctionsTools(this.clients));
    maybeRegister(TranscendMcpServer.Preferences, getPreferenceTools(this.clients));
    maybeRegister(TranscendMcpServer.Inventory, getInventoryTools(this.clients));
    maybeRegister(TranscendMcpServer.Discovery, getDiscoveryTools(this.clients));
    maybeRegister(TranscendMcpServer.Assessment, getAssessmentTools(this.clients));
    maybeRegister(TranscendMcpServer.Workflows, getWorkflowTools(this.clients));
    maybeRegister(TranscendMcpServer.Policy, getPolicyTools(this.clients));
    maybeRegister(TranscendMcpServer.PrivacyCenter, getPrivacyCenterTools(this.clients));
    maybeRegister(TranscendMcpServer.Admin, getAdminTools(this.clients));
    maybeRegister(TranscendMcpServer.Config, getConfigTools(this.clients));
  }

  private registerToolsFromModule(tools: ToolDefinition[]): void {
    for (const tool of tools) {
      if (!shouldRegisterTool(tool)) {
        continue;
      }
      if (this.tools.has(tool.name)) {
        this.logger.warn('Duplicate tool name - skipping', { toolName: tool.name });
        continue;
      }
      this.tools.set(tool.name, tool);
      this.jsonSchemaCache.set(tool.name, toolInputSchema(tool.zodSchema));
    }
  }

  /**
   * Tool descriptors as a host would see them.
   *
   * The serving path builds descriptors in `buildMcpServer` rather than here, so
   * this method exists for callers embedding the registry directly. It still
   * resolves capability variants and carries `_meta`, because a descriptor list
   * that quietly disagreed with what the server actually serves would be worse
   * than no method at all.
   */
  getToolList(
    /** Capabilities of the host being served; defaults to a host with none */
    client: ClientCapabilityReport = EMPTY_CAPABILITY_REPORT,
  ): Array<{
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    annotations: {
      readOnlyHint: boolean;
      destructiveHint: boolean;
      idempotentHint: boolean;
    };
    _meta?: Record<string, unknown>;
  }> {
    // Nothing here can obtain approval, so a gated tool would only be described
    // and then refuse. `executeTool` still refuses it either way.
    const canApprove = canObtainApproval(EMBEDDED_GATE, client);

    return expandToolsForClient(Array.from(this.tools.values()), client, EMBEDDED_GATE)
      .filter((tool) => isVisibleToModel(tool))
      .filter((tool) => canApprove || !tool.confirmation)
      .map((tool) => {
        const resourceUri = tool.ui?.resource.uri;
        return {
          name: tool.name,
          description: tool.description,
          inputSchema: this.jsonSchemaCache.get(tool.name) || { type: 'object', properties: {} },
          annotations: tool.annotations,
          ...(resourceUri && {
            _meta: { ui: { resourceUri }, 'ui/resourceUri': resourceUri },
          }),
        };
      });
  }

  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  async executeTool(
    name: string,
    args: Record<string, unknown>,
    /** Capabilities of the host being served; defaults to a host with none */
    client: ClientCapabilityReport = EMPTY_CAPABILITY_REPORT,
  ): Promise<unknown> {
    const registered = this.tools.get(name);
    if (!registered) {
      throw new Error(`Unknown tool: ${name}`);
    }

    // Resolve so the handler that runs matches the descriptor getToolList emitted,
    // and gate it: calling the registered handler directly would walk past the
    // confirmation a gated tool asked for.
    const tool = withConfirmation(resolveToolVariant(registered, client), EMBEDDED_GATE);

    const parseResult = tool.zodSchema.safeParse(args);
    if (!parseResult.success) {
      const issues = parseResult.error.issues
        .map((i: any) => `${i.path.join('.') || 'input'}: ${i.message}`)
        .join('; ');
      throw new Error(`Invalid input: ${issues}`);
    }

    try {
      return await tool.handler(parseResult.data);
    } catch (error) {
      return createErrorResult(error);
    }
  }

  getToolsByCategory(category: string): ToolDefinition[] {
    return Array.from(this.tools.values()).filter((tool) => tool.category === category);
  }

  getCategories(): string[] {
    const categories = new Set<string>();
    for (const tool of this.tools.values()) {
      categories.add(tool.category);
    }
    return Array.from(categories);
  }

  getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  getToolCount(): number {
    return this.tools.size;
  }
}
