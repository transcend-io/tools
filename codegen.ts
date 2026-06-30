/**
 * GraphQL Code Generator configuration for the Transcend MCP server packages.
 *
 * Each GraphQL-backed MCP server gets a `src/__generated__/` `client-preset`
 * output: a typed `graphql()` template tag and `TypedDocumentNode`s for every
 * embedded operation. The server's `graphql.ts` files use this tag, and
 * `TranscendGraphQLBase.makeRequest` infers `TResult`/`TVariables` from the
 * document, so consumer/schema drift fails `tsc` instead of at runtime.
 *
 * The schema is read from the committed `schema.graphql` at the repo root.
 * Refresh it with `pnpm graphql:refresh-schema`; the committed snapshot keeps
 * local and CI builds hermetic (no network round-trip during builds).
 */
import type { CodegenConfig } from '@graphql-codegen/cli';

const SCHEMA_PATH = './schema.graphql';

/**
 * GraphQL-backed MCP servers. Each entry corresponds to a package directory
 * `packages/mcp/mcp-server-${name}` containing a `src/graphql.ts` file with
 * embedded operations. The `mcp-server-base`, `mcp-server-consent`, and
 * `mcp-server-preferences` packages are intentionally excluded:
 *   - base has no GraphQL operations of its own.
 *   - consent/preferences hit REST endpoints, not GraphQL.
 */
const SERVERS = ['admin', 'assessment', 'discovery', 'dsr', 'inventory', 'workflows'] as const;

const config: CodegenConfig = {
  schema: SCHEMA_PATH,
  // Tolerate servers that haven't migrated to the typed `graphql()` tag yet.
  // Once every operation in a package is on the typed tag, the
  // `description-audit` test guarantees coverage; this flag keeps codegen
  // green while migrations land incrementally.
  ignoreNoDocuments: true,
  generates: Object.fromEntries(
    SERVERS.flatMap((server) => {
      const pkgRoot = `packages/mcp/mcp-server-${server}/src`;
      const documents = [`${pkgRoot}/**/*.ts`, `!${pkgRoot}/__generated__/**`];
      return [
        [
          `${pkgRoot}/__generated__/`,
          {
            documents,
            preset: 'client',
            config: {
              useTypeImports: true,
              skipTypename: false,
              // `verbatimModuleSyntax` + `moduleResolution: NodeNext` require
              // explicit `.js` extensions on relative imports inside emitted
              // ESM. Disable the legacy CJS shim so the preset emits clean
              // ESM-style relative imports with `.js` extensions.
              emitLegacyCommonJSImports: false,
              importExtension: '.js',
              // Transcend's GraphQL API exposes a custom `Date` scalar (ISO-8601
              // strings, not the JS `Date` instance). Map it to a native string
              // so the response/variables types stay JSON-friendly.
              scalars: {
                Date: 'string',
              },
            },
            presetConfig: {
              fragmentMasking: false,
            },
          },
        ],
      ] as const;
    }),
  ),
};

export default config;
