/** Environment variable that enables test-only URL overrides when set to `1`. */
export const ALLOW_TEST_OVERRIDES_ENV = 'ALLOW_TEST_OVERRIDES';

/** Environment variable that disables server confirmation gates when set to `1`. */
export const MCP_SKIP_CONFIRMATION_ENV = 'MCP_SKIP_CONFIRMATION';

/** Environment variable that registers tools marked `experimental: true` when set to `1`. */
export const TRANSCEND_MCP_EXPERIMENTAL_ENV = 'TRANSCEND_MCP_EXPERIMENTAL';

/**
 * Controls registration of raw GraphQL fallback tools (`graphql_inspect_schema`,
 * `graphql_query`, `graphql_mutate`).
 */
export const TRANSCEND_MCP_GRAPHQL_TOOLS_ENV = 'TRANSCEND_MCP_GRAPHQL_TOOLS';

/** Which GraphQL fallback tools the server should register. */
export type GraphqlToolsMode = 'all' | 'read' | 'off';

const GRAPHQL_MODE_ALL = new Set(['all', 'on', '1', 'true']);
const GRAPHQL_MODE_READ = new Set(['read']);
const GRAPHQL_MODE_OFF = new Set(['off', '0', 'false', 'none']);

let loggedInvalidGraphqlToolsMode = false;

/**
 * Returns which GraphQL fallback tools are eligible for registration.
 *
 * - unset / `all` / `on` / `1` / `true`: inspect, query, and mutate
 * - `read`: inspect and query only
 * - `off` / `0` / `false` / `none`: none
 * - unknown values: `off` (fail closed) after one warning
 */
export function graphqlToolsMode(): GraphqlToolsMode {
  const raw = process.env[TRANSCEND_MCP_GRAPHQL_TOOLS_ENV]?.trim().toLowerCase();
  if (!raw || GRAPHQL_MODE_ALL.has(raw)) {
    return 'all';
  }
  if (GRAPHQL_MODE_READ.has(raw)) {
    return 'read';
  }
  if (GRAPHQL_MODE_OFF.has(raw)) {
    return 'off';
  }
  if (!loggedInvalidGraphqlToolsMode) {
    loggedInvalidGraphqlToolsMode = true;
    // eslint-disable-next-line no-console
    console.warn(
      `${TRANSCEND_MCP_GRAPHQL_TOOLS_ENV}=${JSON.stringify(process.env[TRANSCEND_MCP_GRAPHQL_TOOLS_ENV])} is invalid; ` +
        'GraphQL fallback tools are disabled. Valid values: all, read, off.',
    );
  }
  return 'off';
}

/** Whether read-only GraphQL fallback tools (inspect + query) register. */
export function graphqlReadToolsEnabled(): boolean {
  const mode = graphqlToolsMode();
  return mode === 'all' || mode === 'read';
}

/** Whether the `graphql_mutate` fallback tool registers. */
export function graphqlMutateToolsEnabled(): boolean {
  return graphqlToolsMode() === 'all';
}

/**
 * Returns true when test-only environment overrides are enabled.
 * Requires `ALLOW_TEST_OVERRIDES=1`; unset or any other value is treated as disabled.
 */
export function allowTestOverrides(): boolean {
  return process.env[ALLOW_TEST_OVERRIDES_ENV] === '1';
}

/**
 * Returns true when consequential tool confirmation gates are bypassed.
 * Requires `MCP_SKIP_CONFIRMATION=1`; unset or any other value keeps gates enabled.
 */
export function skipConfirmation(): boolean {
  return process.env[MCP_SKIP_CONFIRMATION_ENV] === '1';
}

/**
 * Returns true when tools marked `experimental: true` should be registered.
 * Requires `TRANSCEND_MCP_EXPERIMENTAL=1`; unset or any other value omits them.
 */
export function experimentalToolsEnabled(): boolean {
  return process.env[TRANSCEND_MCP_EXPERIMENTAL_ENV] === '1';
}

/**
 * Returns a test-only environment override, or the production default.
 */
export function resolveTestOverride(envVar: string, productionDefault: string): string {
  if (allowTestOverrides()) {
    const override = process.env[envVar]?.trim();
    if (override) {
      return override;
    }
  }
  return productionDefault;
}
