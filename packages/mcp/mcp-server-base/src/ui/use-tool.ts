import type { App } from '@modelcontextprotocol/ext-apps';
import { useCallback, useRef, useState } from 'react';

import { parseToolEnvelope, type ParsedToolResult } from './tool-envelope.js';

export type { ParsedToolResult } from './tool-envelope.js';

/** Loading, error, and result state for a single MCP server tool. */
export interface UseToolState<TData> {
  /** Most recent successful payload for this tool */
  data: TData | undefined;
  /** Error message from the most recent failed call, if any */
  error: string | undefined;
  /** Whether a {@link UseToolState.call} request is in flight */
  isLoading: boolean;
  /**
   * Invokes this tool on the originating server.
   *
   * Unlike {@link import('./use-mcp-app.js').McpAppState.callTool}, this keeps
   * its own `data` / `error` and does not overwrite the view's open/refresh
   * payload. Concurrent calls: the latest response wins for `data` / `error`;
   * each `call()` promise still resolves to that invocation's parsed result,
   * including list pagination when present.
   *
   * @param args - Tool arguments (defaults to `{}`)
   * @returns Parsed payload and list metadata; `data` is undefined on error
   */
  call: (args?: Record<string, unknown>) => Promise<ParsedToolResult<TData>>;
}

/**
 * Calls one named MCP tool from a view and tracks its own loading / error / result.
 *
 * Use this when the view needs tools beyond the open/refresh payload that
 * {@link import('./use-mcp-app.js').useMcpApp} owns. Pair with `app` from
 * `useMcpApp`; one hook instance per tool name.
 *
 * @param app - Connected app from `useMcpApp`, or null while connecting
 * @param toolName - Tool to invoke (model-facing or `visibility: ['app']`)
 * @returns Per-tool state and a `call` helper
 *
 * @example
 * ```tsx
 * const { app, isConnected } = useMcpApp({ appInfo: { name: 'my-view', version: '1.0.0' } });
 * const org = useTool<{ name: string }>(app, 'admin_get_organization');
 *
 * useEffect(() => {
 *   if (isConnected) void org.call({});
 * }, [isConnected, org.call]);
 * ```
 */
export function useTool<TData = unknown>(app: App | null, toolName: string): UseToolState<TData> {
  const [data, setData] = useState<TData | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  const inFlightCount = useRef(0);
  const latestCallId = useRef(0);

  const call = useCallback(
    async (args?: Record<string, unknown>): Promise<ParsedToolResult<TData>> => {
      if (!app) {
        throw new Error(`Cannot call "${toolName}" before the app is connected to its host`);
      }

      latestCallId.current += 1;
      const callId = latestCallId.current;
      inFlightCount.current += 1;
      setIsLoading(true);

      try {
        const result = await app.callServerTool({
          name: toolName,
          arguments: args ?? {},
        });
        const parsed = parseToolEnvelope<TData>(result);
        if (parsed.error !== undefined) {
          console.error(`[mcp-app] useTool "${toolName}" failed`, parsed.error, result);
        }
        if (callId === latestCallId.current) {
          setData(parsed.data);
          setError(parsed.error);
        }
        return parsed;
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : String(caught);
        console.error(`[mcp-app] useTool "${toolName}" threw`, caught);
        if (callId === latestCallId.current) {
          setData(undefined);
          setError(message);
        }
        return { data: undefined, error: message };
      } finally {
        inFlightCount.current = Math.max(0, inFlightCount.current - 1);
        if (inFlightCount.current === 0) {
          setIsLoading(false);
        }
      }
    },
    [app, toolName],
  );

  return {
    data,
    error,
    isLoading,
    call,
  };
}
