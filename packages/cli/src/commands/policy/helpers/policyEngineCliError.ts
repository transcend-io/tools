/** Whether policy commands should include technical error details in output. */
let policyEngineCliDebugEnabled = false;

/**
 * Enables or disables technical Policy Engine CLI error output for the current command run.
 *
 * @param enabled - When true, API causes and stack traces are included in failures
 */
export function setPolicyEngineCliDebug(enabled: boolean): void {
  policyEngineCliDebugEnabled = enabled;
}

/**
 * Returns true when `--debug` was passed to a policy command.
 *
 * @returns Whether debug output is enabled
 */
export function isPolicyEngineCliDebugEnabled(): boolean {
  return policyEngineCliDebugEnabled;
}

/**
 * User-facing Policy Engine CLI error without a stack trace by default.
 */
export class PolicyEngineCliError extends Error {
  /**
   * Creates a policy CLI error suitable for end-user output.
   *
   * @param message - User-readable error text
   * @param options - Optional underlying failure
   */
  constructor(
    message: string,
    options?: {
      /** Original failure, typically a got HTTPError */
      cause?: unknown;
    },
  ) {
    super(message, { cause: options?.cause });
    this.name = 'PolicyEngineCliError';
  }
}

/**
 * Formats a Policy Engine CLI error for terminal output.
 *
 * @param error - Thrown policy CLI error
 * @returns Message only by default; technical details when debug mode is enabled
 */
export function formatPolicyEngineCliErrorForTerminal(error: PolicyEngineCliError): string {
  if (!isPolicyEngineCliDebugEnabled()) {
    return error.message;
  }

  const parts = [error.message, '', 'Debug details:'];
  const cause = error.cause;

  if (cause instanceof Error) {
    parts.push(cause.stack ?? cause.message);
  } else if (cause !== undefined) {
    parts.push(String(cause));
  } else {
    parts.push('No underlying cause was recorded.');
  }

  return parts.join('\n');
}

/**
 * Formats thrown values for Stricli, suppressing stacks for policy CLI errors unless debug is enabled.
 *
 * @param exc - Thrown value from a command
 * @returns Terminal-safe error text
 */
export function formatPolicyEngineCliException(exc: unknown): string | undefined {
  if (exc instanceof PolicyEngineCliError) {
    return formatPolicyEngineCliErrorForTerminal(exc);
  }

  return undefined;
}
