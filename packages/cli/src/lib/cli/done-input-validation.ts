/**
 * Process dependencies used after command input validation.
 */
export interface DoneInputValidationProcess {
  /** Environment variables for the current command runtime */
  readonly env: NodeJS.ProcessEnv;
  /** Exit the current command runtime */
  readonly exit: (code?: number) => void;
}

/**
 * If the environment variable `DEVELOPMENT_MODE_VALIDATE_ONLY` is set,
 * this function will exit the process with a status code of 0.
 *
 * This is useful for development mode, where we want to validate the
 * command flags without actually running the command.
 *
 * This should be called after input validation, and must be agnostic to the environment (e.g., the existence of a file on the file system)
 *
 * @param process - Process dependencies for environment access and exit.
 */
export function doneInputValidation(process: DoneInputValidationProcess): void {
  if (process.env.DEVELOPMENT_MODE_VALIDATE_ONLY === 'true') {
    process.exit(0);
  }
}
