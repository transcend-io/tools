import { buildSchema, type GraphQLSchema } from 'graphql';

import schemaSdl from './schema-snapshot.graphql';

let cached: GraphQLSchema | undefined;

/** Note shown on inspect results so agents know the snapshot source. */
export const SCHEMA_SNAPSHOT_NOTE =
  'Bundled schema snapshot from staging GraphQL (committed as schema.graphql in the Transcend tools repo). ' +
  'Production may differ slightly; live calls use the API you are signed into.';

/** Lazily parsed SDL bundled at build time from the repo-root schema snapshot. */
export function getBundledSchema(): GraphQLSchema {
  if (!cached) {
    cached = buildSchema(schemaSdl, { assumeValid: true });
  }
  return cached;
}
