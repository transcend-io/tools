/**
 * Machine-readable failures the assessment tools return, each paired with
 * whether a retry can help.
 *
 * The two travel together because `createToolResult` types `code` as a bare
 * string and takes `retryable` beside it, so nothing stops two sites emitting
 * one code with opposite retry advice. Naming the pair once removes the choice
 * from the call site.
 *
 * These name the remedy rather than the class of problem. `ErrorCode` is the
 * transport taxonomy for thrown `ToolError`s and answers "was this auth, or a
 * timeout"; a caller that reached one of these already knows the request was
 * accepted and needs to be told what to change.
 */

/** No assignee of any kind given, so the form could not accept answers. */
export const PREFILL_ASSIGNEE_REQUIRED = {
  code: 'ASSESSMENT_PREFILL_ASSIGNEE_REQUIRED',
  retryable: false,
} as const;

/**
 * Submission was asked for with only external assignees.
 *
 * Kept apart from {@link PREFILL_ASSIGNEE_REQUIRED} because the remedy differs:
 * this caller supplied assignees and still has to add an internal one.
 */
export const PREFILL_INTERNAL_ASSIGNEE_REQUIRED = {
  code: 'ASSESSMENT_PREFILL_INTERNAL_ASSIGNEE_REQUIRED',
  retryable: false,
} as const;

/**
 * The form was built but some answers did not land, so it can be finished.
 *
 * Not retryable despite the call having failed: the form exists, so running
 * assessments_prefill again builds a second one. A client that retries on the
 * flag alone would duplicate the record it was trying to repair.
 */
export const PREFILL_INCOMPLETE = {
  code: 'ASSESSMENT_PREFILL_INCOMPLETE',
  retryable: false,
} as const;
