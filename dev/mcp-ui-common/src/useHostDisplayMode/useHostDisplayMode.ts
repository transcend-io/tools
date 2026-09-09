import type { App, McpUiDisplayMode } from '@modelcontextprotocol/ext-apps';
import { useCallback, useEffect, useState } from 'react';

/** Host display-mode state and a guarded request helper for MCP Apps. */
export interface HostDisplayModeState {
  /** Current host display mode; defaults to inline until the host reports otherwise */
  displayMode: McpUiDisplayMode;
  /** Display modes the host currently allows */
  availableDisplayModes: readonly McpUiDisplayMode[];
  /** Whether the host advertises fullscreen */
  canFullscreen: boolean;
  /** Whether the view is currently fullscreen */
  isFullscreen: boolean;
  /**
   * Asks the host to switch modes. No-ops when the app is missing or the host
   * does not advertise the requested mode. Must run from a user gesture.
   */
  requestDisplayMode: (mode: McpUiDisplayMode) => Promise<McpUiDisplayMode | undefined>;
}

/**
 * Tracks the host's display mode and requests changes via the MCP Apps bridge.
 *
 * The view must declare the modes it supports in `useMcpApp` capabilities
 * (`availableDisplayModes`); this hook only reads what the host grants.
 */
export function useHostDisplayMode(app: App | null): HostDisplayModeState {
  const [displayMode, setDisplayMode] = useState<McpUiDisplayMode>('inline');
  const [availableDisplayModes, setAvailableDisplayModes] = useState<readonly McpUiDisplayMode[]>(
    [],
  );

  useEffect(() => {
    if (!app) {
      return undefined;
    }

    const syncFromHost = (): void => {
      const context = app.getHostContext();
      if (context?.displayMode !== undefined) {
        setDisplayMode(context.displayMode);
      }
      if (context?.availableDisplayModes !== undefined) {
        setAvailableDisplayModes(context.availableDisplayModes);
      }
    };

    syncFromHost();
    app.addEventListener('hostcontextchanged', syncFromHost);
  }, [app]);

  const requestDisplayMode = useCallback(
    async (mode: McpUiDisplayMode): Promise<McpUiDisplayMode | undefined> => {
      if (!app || !availableDisplayModes.includes(mode)) {
        return undefined;
      }
      const result = await app.requestDisplayMode({ mode });
      setDisplayMode(result.mode);
      return result.mode;
    },
    [app, availableDisplayModes],
  );

  return {
    displayMode,
    availableDisplayModes,
    canFullscreen: availableDisplayModes.includes('fullscreen'),
    isFullscreen: displayMode === 'fullscreen',
    requestDisplayMode,
  };
}
