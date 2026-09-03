/**
 * Browser-side helpers for building MCP App views with React.
 *
 * This entry point is **browser-only** and is published separately from the
 * package root as `@transcend-io/mcp-server-base/ui`. Keeping it separate is
 * load-bearing: the root barrel reaches into `node:async_hooks`, GraphQL
 * clients, and OAuth, none of which can run in a sandboxed iframe. Import only
 * from this subpath in view code so that graph stays unreachable.
 *
 * React, `@modelcontextprotocol/ext-apps`, and `tailwindcss` are optional peer
 * dependencies — they are needed only by packages that actually ship a view.
 *
 * Styling lives alongside this entry as `./theme.css`, imported from a view's
 * own stylesheet rather than re-exported here, because Tailwind has to see it at
 * build time.
 *
 * @example
 * ```tsx
 * import { FullscreenButton, useMcpApp, useTool } from '@transcend-io/mcp-server-base/ui';
 *
 * export function View() {
 *   const { app, data, isConnected } = useMcpApp<{ greeting: string }>({
 *     appInfo: { name: 'my-view', version: '1.0.0' },
 *     capabilities: { availableDisplayModes: ['inline', 'fullscreen'] },
 *   });
 *   const org = useTool<{ name: string }>(app, 'admin_get_organization');
 *   return (
 *     <>
 *       <FullscreenButton app={app} />
 *       <p>{isConnected ? data?.greeting : 'Connecting…'}</p>
 *     </>
 *   );
 * }
 * ```
 */

export { FullscreenButton, type FullscreenButtonProps } from './FullscreenButton.js';
export { useHostDisplayMode, type HostDisplayModeState } from './use-host-display-mode.js';
export { useMcpApp, type McpAppState, type UseMcpAppOptions } from './use-mcp-app.js';
export { useTool, type UseToolState, type ParsedToolResult } from './use-tool.js';
