/**
 * Presentational React components for Transcend MCP App views.
 *
 * These components are props-in / JSX-out: no `useMcpApp`, no MCP SDK, and no
 * server tools. Style with utilities from `@transcend-io/mcp-server-base/ui/theme.css`
 * only. The view build always `@source`s this package so Tailwind generates the
 * utilities the components reference.
 */

export * from './button/index.js';
export * from './card/index.js';
export * from './icon/index.js';
export * from './progress/index.js';
