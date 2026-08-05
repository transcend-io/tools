import {
  useApp,
  useDocumentTheme,
  useHostStyles,
  type App,
  type McpUiAppCapabilities,
  type McpUiTheme,
} from '@modelcontextprotocol/ext-apps/react';
import type { Implementation } from '@modelcontextprotocol/sdk/types.js';
import { useCallback, useRef, useState } from 'react';

import { parseToolEnvelope } from './tool-envelope.js';

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
 * into typed `data`. This hook only feeds the host's values to CSS custom
 * properties; the view supplies its own stylesheet.
 *
 * The initial payload arrives as a `ui/notifications/tool-result` notification
 * rather than in the handshake response, so listeners are registered in
 * `onAppCreated` — before `connect()` — to avoid dropping a result that lands
 * immediately. They are attached with `addEventListener` rather than the `on*`
 * setters so a view can observe the same notifications on the returned `app`
 * without displacing this hook's own handling.
 *
 * `appInfo` and `capabilities` are read once, on mount: the underlying `useApp`
 * deliberately does not reconnect when its options change, so later values are
 * ignored.
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

  // Overlapping `callTool` invocations share one loading flag and one `data`
  // slot, so track how many are outstanding and which one is newest. Without
  // this, the first response to land clears the flag while another call is
  // still running, and a slow earlier response overwrites a newer one.
  const inFlightCount = useRef(0);
  const latestCallId = useRef(0);

  const { app, isConnected, error } = useApp({
    appInfo,
    capabilities,
    autoResize: true,
    onAppCreated: (created: App) => {
      created.addEventListener('toolresult', (params) => {
        const parsed = parseToolEnvelope<TData>(params);
        setData(parsed.data);
        setToolError(parsed.error);
      });
      created.addEventListener('toolcancelled', (params) => {
        setToolError(params.reason ?? 'Tool call cancelled');
        // A cancelled call may never settle, so abandon everything in flight
        // rather than leaving `isCallingTool` stuck on forever.
        latestCallId.current += 1;
        inFlightCount.current = 0;
        setIsCallingTool(false);
      });
    },
  });

  useHostStyles(app, app?.getHostContext());
  const theme = useDocumentTheme();

  const callTool = useCallback(
    async (name: string, args?: Record<string, unknown>): Promise<TData | undefined> => {
      if (!app) {
        throw new Error(`Cannot call "${name}" before the app is connected to its host`);
      }
      latestCallId.current += 1;
      const callId = latestCallId.current;
      inFlightCount.current += 1;
      setIsCallingTool(true);
      try {
        const result = await app.callServerTool({ name, arguments: args ?? {} });
        const parsed = parseToolEnvelope<TData>(result);
        if (callId === latestCallId.current) {
          setData(parsed.data);
          setToolError(parsed.error);
        }
        return parsed.error === undefined ? parsed.data : undefined;
      } finally {
        inFlightCount.current = Math.max(0, inFlightCount.current - 1);
        if (inFlightCount.current === 0) {
          setIsCallingTool(false);
        }
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
