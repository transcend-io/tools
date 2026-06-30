/**
 * Refresh the committed `schema.graphql` at the repo root by introspecting
 * the Transcend staging GraphQL endpoint.
 *
 * Why staging (vs Apollo Studio):
 *   - Zero-friction: introspection is anonymous, so any contributor can
 *     refresh without provisioning an Apollo Studio key or installing the
 *     Rover CLI.
 *   - Same content: Apollo Studio's `Transcend-io@current` graph variant
 *     is itself produced by `rover graph introspect <staging>` in the
 *     backend release pipeline, so the bytes are identical at any moment
 *     when both are in sync.
 *   - Better dev velocity: catches schema changes the moment they hit
 *     staging, rather than waiting for the next prod release.
 *
 * Trade-off: the schema may include staging-only types that haven't yet
 * shipped to prod. Anyone shipping a tool that depends on a brand-new
 * field should verify it has actually rolled out to `api.transcend.io`
 * before publishing.
 *
 * Run modes:
 *   - Local:    `pnpm graphql:refresh-schema` (reads `secret.env` for
 *               `TRANSCEND_API_URL` overrides; defaults to staging).
 *   - CI cron:  `.github/workflows/refresh-graphql-schema.yml` invokes
 *               this on a weekly schedule and opens a PR with the diff.
 *
 * Output post-processing:
 *   The script re-prints the SDL via graphql-js `printSchema` after
 *   stripping every type/field description. Author-written descriptions
 *   on the schema may include internal context (deprecation notes,
 *   partner names, business rules) that we do not want to surface via
 *   this public repository.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  buildClientSchema,
  getIntrospectionQuery,
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLObjectType,
  type IntrospectionQuery,
  printSchema,
} from 'graphql';

const DEFAULT_STAGING_URL = 'https://api.staging.transcen.dental';

interface IntrospectionResponse {
  data?: IntrospectionQuery;
  errors?: Array<{ message: string }>;
}

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
 * Belt-and-suspenders description scrubbing. The introspection query is
 * already issued with `descriptions: false`, but we additionally clear any
 * residual `description` properties on the materialized schema before
 * printing — that way a future change to the introspection query options
 * (or a graphql-js default tweak) cannot silently re-leak prose into the
 * committed file.
 */
function stripDescriptions(
  introspection: IntrospectionQuery,
): ReturnType<typeof buildClientSchema> {
  const schema = buildClientSchema(introspection);
  for (const type of Object.values(schema.getTypeMap())) {
    if (type.name.startsWith('__')) continue;
    (type as { description?: string | null }).description = null;

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
    }
  }
  return schema;
}

async function main(): Promise<void> {
  loadSecretEnv();

  const baseUrl = (process.env.TRANSCEND_API_URL ?? DEFAULT_STAGING_URL).replace(/\/$/, '');
  const url = `${baseUrl}/graphql`;
  // eslint-disable-next-line no-console
  console.error(`Introspecting ${url}…`);

  // Introspection is anonymous, so we deliberately send no Authorization
  // header. Passing an API key adds nothing and an expired/wrong-scope key
  // would only cause a needless 401 (the backend's own release pipeline also
  // introspects staging without auth).
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      query: getIntrospectionQuery({ descriptions: false }),
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Introspection HTTP ${response.status}: ${text}`);
  }

  const result = (await response.json()) as IntrospectionResponse;
  if (result.errors?.length) {
    throw new Error(`Introspection errors: ${result.errors.map((e) => e.message).join('; ')}`);
  }
  if (!result.data) {
    throw new Error('Introspection returned no data');
  }

  const schema = stripDescriptions(result.data);
  const sdl = printSchema(schema);
  const banner = `# Generated by scripts/refresh-graphql-schema.ts
# Source: ${url} (introspection); descriptions stripped.
# DO NOT EDIT BY HAND. Run \`pnpm graphql:refresh-schema\` to regenerate.
`;
  const outputPath = resolve(process.cwd(), 'schema.graphql');
  writeFileSync(outputPath, `${banner}\n${sdl}\n`);

  // eslint-disable-next-line no-console
  console.error(`Wrote ${outputPath} (${sdl.length} bytes).`);
}

main().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
