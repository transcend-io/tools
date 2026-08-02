import {
  useApp,
  useDocumentTheme,
  useHostStyles,
  type App,
  type McpUiAppCapabilities,
  type McpUiTheme,
} from '@modelcontextprotocol/ext-apps/react';
import type { CallToolResult, Implementation } from '@modelcontextprotocol/sdk/types.js';
import { useCallback, useState } from 'react';

/**
 * The envelope every Transcend MCP tool returns, as produced by
 * `createToolResult`. Views receive it as JSON in the first text content block.
 */
interface ToolEnvelope<TData> {
  /** Whether the tool call succeeded */
  success?: boolean;
  /** Result payload when successful */
  data?: TData;
  /** Human-readable error message when unsuccessful */
  error?: string;
}

/**
 * Pulls the payload out of a tool result.
 *
 * `structuredContent` is preferred because it is the spec's typed channel, but
 * our servers currently serialize the envelope as JSON into the first text
 * block, so that is the path taken in practice.
 */
function parseToolEnvelope<TData>(result: CallToolResult): {
  data: TData | undefined;
  error: string | undefined;
} {
  const raw =
    result.structuredContent ??
    (() => {
      const firstText = result.content?.find((block) => block.type === 'text');
      if (firstText?.type !== 'text') {
        return undefined;
      }
      try {
        return JSON.parse(firstText.text) as unknown;
      } catch {
        // A tool that returns prose rather than JSON is still worth surfacing.
        return { success: !result.isError, data: firstText.text };
      }
    })();

  if (raw === null || typeof raw !== 'object') {
    return { data: undefined, error: result.isError ? 'Tool call failed' : undefined };
  }

  const envelope = raw as ToolEnvelope<TData>;
  const failed = result.isError === true || envelope.success === false;
  return {
    data: envelope.data,
    error: failed ? (envelope.error ?? 'Tool call failed') : undefined,
  };
}

/** Options for {@link useMcpApp}. */
export interface UseMcpAppOptions {
  /** Identifies this view to the host */
  appInfo: Implementation;
  /** Features this view supports; defaults to none */
  capabilities?: McpUiAppCapabilities;
}

/** Connection state, host theme, and tool data for an MCP App view. */
export interface McpAppState<TData> {
  /** Connected app instance, or null while connecting */
  app: App | null;
  /** Whether the handshake with the host completed */
  isConnected: boolean;
  /** Set when the handshake itself failed */
  connectionError: Error | null;
  /** Host's current color theme, kept in sync as the host changes it */
  theme: McpUiTheme;
  /** Payload of the most recent tool result, if any */
  data: TData | undefined;
  /** Error message from the most recent tool result, if it failed */
  toolError: string | undefined;
  /** Whether a {@link McpAppState.callTool} request is in flight */
  isCallingTool: boolean;
  /**
   * Invokes a tool on the server this view came from and folds the response into
   * `data` / `toolError`, so calling a refresh-style tool re-renders the view.
   *
   * Returns the parsed payload, or `undefined` when the tool reported an error.
   */
  callTool: (name: string, args?: Record<string, unknown>) => Promise<TData | undefined>;
}

/**
 * Connects a React view to its MCP host.
 *
 * Wraps the MCP Apps SDK with the conventions this monorepo already uses: host
 * style variables and fonts are applied so the view matches the surrounding
 * client, and tool results are unwrapped from the `createToolResult` envelope
 * into typed `data`. Styling comes from `@transcend-io/mcp-server-base/ui/theme.css`,
 * which a view imports; this hook only feeds it the host's values.
 *
 * The initial payload arrives as a `ui/notifications/tool-result` notification
 * rather than in the handshake response, so the handler is registered in
 * `onAppCreated` — before `connect()` — to avoid dropping a result that lands
 * immediately.
 *
 * @param options - View identity and declared capabilities
 * @returns Connection state, host theme, tool data, and a tool caller
 *
 * @example
 * ```tsx
 * const { data, theme, callTool } = useMcpApp<{ greeting: string }>({
 *   appInfo: { name: 'docs-hello', version: '1.0.0' },
 * });
 * ```
 */
export function useMcpApp<TData = unknown>({
  appInfo,
  capabilities = {},
}: UseMcpAppOptions): McpAppState<TData> {
  const [data, setData] = useState<TData | undefined>(undefined);
  const [toolError, setToolError] = useState<string | undefined>(undefined);
  const [isCallingTool, setIsCallingTool] = useState(false);

  const { app, isConnected, error } = useApp({
    appInfo,
    capabilities,
    autoResize: true,
    onAppCreated: (created: App) => {
      created.ontoolresult = (params) => {
        const parsed = parseToolEnvelope<TData>(params);
        setData(parsed.data);
        setToolError(parsed.error);
      };
      created.ontoolcancelled = (params) => {
        setToolError(params.reason ?? 'Tool call cancelled');
      };
    },
  });

  useHostStyles(app, app?.getHostContext());
  const theme = useDocumentTheme();

  const callTool = useCallback(
    async (name: string, args?: Record<string, unknown>): Promise<TData | undefined> => {
      if (!app) {
        throw new Error(`Cannot call "${name}" before the app is connected to its host`);
      }
      setIsCallingTool(true);
      try {
        const result = await app.callServerTool({ name, arguments: args ?? {} });
        const parsed = parseToolEnvelope<TData>(result);
        setData(parsed.data);
        setToolError(parsed.error);
        return parsed.error === undefined ? parsed.data : undefined;
      } finally {
        setIsCallingTool(false);
      }
    },
    [app],
  );

  return {
    app,
    isConnected,
    connectionError: error,
    theme,
    data,
    toolError,
    isCallingTool,
    callTool,
  };
}
