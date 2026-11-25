import packageJson from '../package.json' with { type: 'json' };
import { MCP_VERSION_HEADER } from './http-header-names.js';

export { MCP_VERSION_HEADER };

/**
 * Value to send as {@link MCP_VERSION_HEADER} on outbound Transcend requests.
 *
 * Resolved from this package's own `package.json` at build time. tsdown inlines
 * the JSON import into a string literal in both the ESM and CJS bundles, so
 * published consumers never need the manifest on disk next to `dist/index.mjs`.
 *
 * No sanitization: unlike `clientInfo.name`, this string is ours, so it cannot
 * carry hostile input and does not need the ASCII allowlist. That difference is
 * exactly why this header is safe to group by on a dashboard while
 * `x-transcend-mcp-client-name` isn't.
 *
 * @returns The package version, or `undefined` when it cannot be resolved
 *   (omit the header rather than sending an empty string)
 */
export function resolveMcpPackageVersion(): string | undefined {
  const version = packageJson.version;
  if (typeof version !== 'string' || version === '') return undefined;
  return version;
}
