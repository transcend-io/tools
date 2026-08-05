import { DsrErrorCode, type DsrErrorCode as DsrErrorCodeType } from './dsrErrorCode.js';

/**
 * Maps each {@link DsrErrorCode} to the HTTP status returned by DSR submission
 * endpoints.
 *
 * Several conflict/not-found codes are pinned at 400 until WAL-10321 flips
 * them to 409/404 after the customer notice window closes.
 */
export const DSR_ERROR_HTTP_STATUS: Record<DsrErrorCodeType, number> = {
  /**
   * Conflict: Conflicts with an identical request that is already open -> 409.
   * https://linear.app/transcend/issue/WAL-10321 - Temporary 400 status until customer notice window closes.
   */
  [DsrErrorCode.DuplicateRequest]: 400,
  /**
   * Conflict: A broader open parent request already covers this one -> 409.
   * https://linear.app/transcend/issue/WAL-10321 - Temporary 400 status until customer notice window closes.
   */
  [DsrErrorCode.OpenParentRequestExists]: 400,
  /**
   * Not found: The request ID being restarted does not exist -> 404.
   * https://linear.app/transcend/issue/WAL-10321 - Temporary 400 status until customer notice window closes.
   */
  [DsrErrorCode.RestartRequestNotFound]: 400,
  /**
   * Conflict: Restart conflicts with the org's restart time-limit policy -> 409.
   * https://linear.app/transcend/issue/WAL-10321 - Temporary 400 status until customer notice window closes.
   */
  [DsrErrorCode.RestartTimeLimitExceeded]: 400,

  /* Bad request: Payload exceeds the allowed number of submissions per request. */
  [DsrErrorCode.SubmissionLimitExceeded]: 400,
  /* Bad request: Encryption context is inconsistent across items in the request. */
  [DsrErrorCode.MixedCekContext]: 400,
  /* Bad request: Request is missing the required Diffie-Hellman encrypted context. */
  [DsrErrorCode.DhContextRequired]: 400,
  /* Bad request: Request input is otherwise malformed or invalid. */
  [DsrErrorCode.InvalidInput]: 400,
  /* Bad request: DROP linkage identifiers do not cover the required types. */
  [DsrErrorCode.DropIdentifierCoverageMismatch]: 400,
  /**
   * Conflict: A concurrent bulk submission already created one or more requests -> 409.
   * https://linear.app/transcend/issue/WAL-10321 - Temporary 400 status until customer notice window closes.
   */
  [DsrErrorCode.ConcurrentSubmissionConflict]: 400,
  /**
   * Not found: The referenced DROP run does not exist -> 404.
   * https://linear.app/transcend/issue/WAL-10321 - Temporary 400 status until customer notice window closes.
   */
  [DsrErrorCode.DropRunNotFound]: 400,
};
