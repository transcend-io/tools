import { makeEnum } from '@transcend-io/type-utils';

/**
 * Per-input outcome for `POST /v1/data-subject-request-bulk` responses.
 *
 * Returned on successful bulk submissions so callers can branch without parsing
 * error messages. Failures continue to use {@link DsrErrorCode}.
 */
export const DsrRequestOutcome = makeEnum({
  /** A new request was created. */
  Created: 'CREATED',
  /** An equivalent open request already exists for this submission. */
  AlreadyOpen: 'ALREADY_OPEN',
  /** DROP records were linked to an existing request without creating a new one. */
  Linked: 'LINKED',
  /** An existing request was restarted. */
  Restarted: 'RESTARTED',
});

/** Type override */
export type DsrRequestOutcome = (typeof DsrRequestOutcome)[keyof typeof DsrRequestOutcome];
