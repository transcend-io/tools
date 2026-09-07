import inquirer from 'inquirer';

import type { LocalContext } from '../../../context.js';

/** One select/checkbox option. */
export interface PromptChoice<T extends string> {
  /** User-facing label. */
  name: string;
  /** Stable answer value. */
  value: T;
  /** Whether a checkbox starts selected. */
  checked?: boolean;
}

/** Error used to map prompt cancellation to exit status 130. */
export class PromptCancelledError extends Error {
  /** Construct a stable cancellation error. */
  public constructor() {
    super('Prompt cancelled.');
    this.name = 'PromptCancelledError';
  }
}

/**
 * Normalize Inquirer cancellation across supported versions.
 *
 * @param error - Prompt error
 * @returns Stable cancellation error or original error
 */
function normalizePromptError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  if (
    error instanceof PromptCancelledError ||
    /force closed|prompt.*cancel|user.*close|SIGINT/iu.test(message)
  ) {
    return new PromptCancelledError();
  }
  return error instanceof Error ? error : new Error(message);
}

/** Context-stream-bound prompt adapters. */
export class CustomFunctionPrompts {
  /** Inquirer prompt module. */
  private readonly prompt: ReturnType<typeof inquirer.createPromptModule>;

  /**
   * Create adapters bound to command-owned streams.
   *
   * @param context - CLI context
   */
  public constructor(context: LocalContext) {
    this.prompt = inquirer.createPromptModule({
      input: context.process.stdin,
      output: context.process.stderr,
    });
  }

  /**
   * Prompt for non-empty text.
   *
   * @param message - User-facing question
   * @param defaultValue - Suggested value
   * @returns Answer
   */
  public async text(message: string, defaultValue?: string): Promise<string> {
    try {
      const answer = await this.prompt<{ value: string }>([
        {
          type: 'input',
          name: 'value',
          message,
          ...(defaultValue === undefined ? {} : { default: defaultValue }),
          validate: (value: string) => value.trim().length > 0 || 'Enter a value.',
        },
      ]);
      return answer.value.trim();
    } catch (error) {
      throw normalizePromptError(error);
    }
  }

  /**
   * Prompt for one choice.
   *
   * @param message - User-facing question
   * @param choices - Available choices
   * @param defaultValue - Suggested value
   * @returns Selected value
   */
  public async select<T extends string>(
    message: string,
    choices: readonly PromptChoice<T>[],
    defaultValue?: T,
  ): Promise<T> {
    try {
      const answer = await this.prompt<{ value: T }>([
        {
          type: 'list',
          name: 'value',
          message,
          choices: [...choices],
          ...(defaultValue === undefined ? {} : { default: defaultValue }),
        },
      ]);
      return answer.value;
    } catch (error) {
      throw normalizePromptError(error);
    }
  }

  /**
   * Prompt for any number of choices.
   *
   * @param message - User-facing question
   * @param choices - Available choices
   * @returns Selected values
   */
  public async checkbox<T extends string>(
    message: string,
    choices: readonly PromptChoice<T>[],
  ): Promise<T[]> {
    try {
      const answer = await this.prompt<{ value: T[] }>([
        {
          type: 'checkbox',
          name: 'value',
          message,
          choices: [...choices],
        },
      ]);
      return answer.value;
    } catch (error) {
      throw normalizePromptError(error);
    }
  }

  /**
   * Prompt for final approval.
   *
   * @param message - User-facing question
   * @param defaultValue - Suggested answer
   * @returns Approval
   */
  public async confirm(message: string, defaultValue = true): Promise<boolean> {
    try {
      const answer = await this.prompt<{ value: boolean }>([
        {
          type: 'confirm',
          name: 'value',
          message,
          default: defaultValue,
        },
      ]);
      return answer.value;
    } catch (error) {
      throw normalizePromptError(error);
    }
  }
}
