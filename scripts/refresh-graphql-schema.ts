/**
 * Refresh the committed `schema.graphql` at the repo root by fetching from
 * Apollo Studio's `Transcend-io@current` graph variant.
 *
 * Why Apollo Studio (not staging introspection):
 *   - Apollo Studio is the canonical source-of-truth that the
 *     `transcend-io/main` backend release pipeline publishes to. It is the
 *     same artifact the backend team treats as authoritative.
 *   - It is auth-gated behind `APOLLO_STUDIO_KEY`, so the source itself is
 *     not anonymously public the way `api.staging.transcen.dental` happens
 *     to be.
 *
 * Run modes:
 *   - Local:  `pnpm graphql:refresh-schema` (reads `secret.env` for
 *             `APOLLO_STUDIO_KEY`/`APOLLO_KEY`).
 *   - Manual: An engineer with an Apollo Studio key runs this when the
 *             schema needs refreshing. There is no scheduled cron; the
 *             committed `schema.graphql` is intentionally a snapshot.
 *
 * Behavior when `APOLLO_STUDIO_KEY` is missing:
 *   The script prints a warning and exits 0. Local builds and contributors
 *   without an Apollo Studio key continue to work against the last committed
 *   `schema.graphql`. Only schema *refreshes* require the key.
 *
 * Output post-processing:
 *   The script re-prints the SDL via graphql-js `printSchema` after
 *   stripping every type/field description. Author-written descriptions on
 *   the schema may include internal context (deprecation notes, partner
 *   names, business rules) that we do not want to surface via this
 *   repository.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  buildSchema,
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLUnionType,
  printSchema,
} from 'graphql';

const APOLLO_GRAPH_REF = 'Transcend-io@current';

function loadSecretEnv(): void {
  const path = resolve(process.cwd(), 'secret.env');
  let contents: string;
  try {
    contents = readFileSync(path, 'utf8');
  } catch {
    return;
  }
  for (const rawLine of contents.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (process.env[key] === undefined && value) {
      process.env[key] = value;
    }
  }
}

/**
 * Walk every named type, field, argument, and enum value in the schema and
 * clear their description text. graphql-js exposes `description` as a
 * mutable property on these AST-derived objects, so this is safe.
 */
function stripDescriptions(sdl: string): string {
  const schema = buildSchema(sdl);
  const typeMap = schema.getTypeMap();
  for (const type of Object.values(typeMap)) {
    if (type.name.startsWith('__')) continue;
    const mutableType = type as { description?: string | null };
    mutableType.description = null;

    if (type instanceof GraphQLObjectType || type instanceof GraphQLInterfaceType) {
      for (const field of Object.values(type.getFields())) {
        (field as { description?: string | null }).description = null;
        for (const arg of field.args) {
          (arg as { description?: string | null }).description = null;
        }
      }
    } else if (type instanceof GraphQLInputObjectType) {
      for (const field of Object.values(type.getFields())) {
        (field as { description?: string | null }).description = null;
      }
    } else if (type instanceof GraphQLEnumType) {
      for (const value of type.getValues()) {
        (value as { description?: string | null }).description = null;
      }
    } else if (type instanceof GraphQLScalarType || type instanceof GraphQLUnionType) {
      // Already cleared above.
    }
  }
  return printSchema(schema);
}

function fetchSchemaViaRover(apolloKey: string): string {
  const rover = spawnSync('rover', ['graph', 'fetch', APOLLO_GRAPH_REF], {
    env: { ...process.env, APOLLO_KEY: apolloKey },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 16 * 1024 * 1024,
  });
  if (rover.error) {
    if ((rover.error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(
        'rover CLI not found on $PATH. Install it with:\n' +
          '  curl -sSL https://rover.apollo.dev/nix/v0.26.2 | sh\n' +
          'See https://www.apollographql.com/docs/rover/getting-started for details.',
      );
    }
    throw rover.error;
  }
  if (rover.status !== 0) {
    throw new Error(
      `rover graph fetch ${APOLLO_GRAPH_REF} exited ${rover.status}: ${rover.stderr}`,
    );
  }
  return rover.stdout;
}

function main(): void {
  loadSecretEnv();

  const apolloKey = process.env.APOLLO_STUDIO_KEY ?? process.env.APOLLO_KEY;
  if (!apolloKey) {
    // eslint-disable-next-line no-console
    console.error(
      'APOLLO_STUDIO_KEY (or APOLLO_KEY) is not set; skipping schema refresh.\n' +
        'The committed schema.graphql will be used as-is. To refresh, export\n' +
        'APOLLO_STUDIO_KEY=<service:Transcend-io:…> and re-run.',
    );
    return;
  }

  // eslint-disable-next-line no-console
  console.error(`Fetching ${APOLLO_GRAPH_REF} from Apollo Studio…`);
  const rawSdl = fetchSchemaViaRover(apolloKey);
  const sdl = stripDescriptions(rawSdl);

  const banner = `# Generated by scripts/refresh-graphql-schema.ts
# Source: Apollo Studio (${APOLLO_GRAPH_REF}); descriptions stripped.
# DO NOT EDIT BY HAND. Run \`pnpm graphql:refresh-schema\` to regenerate.
`;
  const outputPath = resolve(process.cwd(), 'schema.graphql');
  writeFileSync(outputPath, `${banner}\n${sdl}\n`);

  // eslint-disable-next-line no-console
  console.error(`Wrote ${outputPath} (${sdl.length} bytes).`);
}

try {
  main();
} catch (err: unknown) {
  // eslint-disable-next-line no-console
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
