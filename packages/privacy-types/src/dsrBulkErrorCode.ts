import { makeEnum } from '@transcend-io/type-utils';

/**
 * Stable, machine-readable error codes for bulk submission failures that apply
 * to the call as a whole rather than a single `input[]` item.
 *
 * Surfaced on `POST /v1/data-subject-request-bulk` when the payload or its
 * preconditions are invalid before per-input processing completes.
 */
export const DsrBulkErrorCode = makeEnum({
  /** The bulk submission included no request inputs. */
  NoInputsProvided: 'NO_INPUTS_PROVIDED',
  /** The bulk submission exceeds the maximum number of inputs. */
  SubmissionLimitExceeded: 'SUBMISSION_LIMIT_EXCEEDED',
  /** The bulk submission mixed inputs with and without a pre-generated CEK context. */
  MixedCekContext: 'MIXED_CEK_CONTEXT',
});

/** Type override */
export type DsrBulkErrorCode = (typeof DsrBulkErrorCode)[keyof typeof DsrBulkErrorCode];
