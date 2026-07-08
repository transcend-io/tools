const LOGGED_IN_USER_ERROR = 'User must be logged in';
const OPTION_VALUE_CREATE_AUTH_ERROR = 'must have a slug or user id to be created';

const BACKEND_AUTH_LIMITATION_MESSAGE =
  'The Transcend API requires a logged-in user session for this operation, but API-key ' +
  'authentication does not provide one. This is a known backend limitation — pushing ' +
  'preference topics (create and update) and creating new preference option values ' +
  'currently fail with API-key auth. Updating existing preference option values by id ' +
  'works. A monolith fix is pending.';

/**
 * Format preference sync errors, surfacing known backend auth limitations.
 *
 * @param err - Caught error
 * @param operation - Human-readable operation name (e.g. "preference topic create")
 * @returns Actionable error message
 */
export function formatPreferenceSyncError(err: unknown, operation: string): string {
  const message = (err as Error).message;
  if (message.includes(LOGGED_IN_USER_ERROR) || message.includes(OPTION_VALUE_CREATE_AUTH_ERROR)) {
    return `Failed to ${operation}: ${BACKEND_AUTH_LIMITATION_MESSAGE}`;
  }
  return message;
}
