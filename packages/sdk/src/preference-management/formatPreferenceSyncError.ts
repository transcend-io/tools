const LOGGED_IN_USER_TOPIC_ERROR = 'User must be logged in to create or update a preference topic';
const OPTION_VALUE_CREATE_AUTH_ERROR = 'must have a slug or user id to be created';

const PRE_DEPLOY_AUTH_LIMITATION_MESSAGE =
  'The Transcend API currently requires a logged-in user session for this operation when using ' +
  'API-key authentication. A monolith fix to allow API-key auth is pending deployment — retry ' +
  'after deploy, or use the Admin Dashboard in the meantime.';

/**
 * Format preference sync errors, surfacing known pre-deploy auth limitations.
 *
 * @param err - Caught error
 * @param operation - Human-readable operation name (e.g. "create preference option value")
 * @returns Actionable error message
 */
export function formatPreferenceSyncError(err: unknown, operation: string): string {
  const message = (err as Error).message;
  if (
    message.includes(LOGGED_IN_USER_TOPIC_ERROR) ||
    message.includes(OPTION_VALUE_CREATE_AUTH_ERROR)
  ) {
    return `Failed to ${operation}: ${PRE_DEPLOY_AUTH_LIMITATION_MESSAGE}`;
  }
  return message;
}
