export { getPreferenceTools } from './tools/index.js';
export { PREFERENCE_OAUTH_SCOPES } from './scopes.js';

export {
  IdentifierSchema,
  QueryPreferencesSchema,
  type IdentifierInput,
  type QueryPreferencesInput,
} from './tools/preferences_query.js';
export {
  UpsertPreferencesSchema,
  type UpsertPreferencesInput,
} from './tools/preferences_upsert.js';
export { UpsertPurposeSchema, UpsertRecordSchema } from './tools/preference-schemas.js';
export {
  DeletePreferencesSchema,
  type DeletePreferencesInput,
} from './tools/preferences_delete.js';
export {
  AppendIdentifiersSchema,
  type AppendIdentifiersInput,
} from './tools/preferences_append_identifiers.js';
export {
  UpdateIdentifiersSchema,
  type UpdateIdentifiersInput,
} from './tools/preferences_update_identifiers.js';
export {
  DeleteIdentifiersSchema,
  type DeleteIdentifiersInput,
} from './tools/preferences_delete_identifiers.js';
