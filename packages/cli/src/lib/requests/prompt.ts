import type { ObjByString } from '@transcend-io/type-utils';
import inquirer from 'inquirer';
import autoCompletePrompt from 'inquirer-autocomplete-prompt';

/** Separator accepted in prompt choice lists. */
export interface PromptSeparator {
  /** Identifies this choice as a separator. */
  readonly type: 'separator';
  /** Text rendered for the separator. */
  readonly line: string;
}

/** Choice accepted by request CSV prompts. */
export type PromptChoice = string | PromptSeparator;

/** Question shape used by request CSV prompts. */
export interface PromptQuestion {
  /** Key used to store the answer. */
  readonly name: string;
  /** Message shown to the user. */
  readonly message: string;
  /** Prompt control type. */
  readonly type: 'autocomplete' | 'checkbox' | 'list';
  /** Default answer. */
  readonly default?: unknown;
  /** Choices shown to the user. */
  readonly choices?: PromptChoice[];
  /** Dynamically filters autocomplete choices. */
  readonly source?: (answersSoFar: ObjByString, input: string) => string[];
}

/** Prompt capability used by request CSV mapping helpers. */
export type RequestPrompt = <TAnswers extends object>(
  questions: PromptQuestion[],
) => Promise<TAnswers>;

let autocompleteRegistered = false;

/**
 * Production prompt adapter for request CSV mapping.
 *
 * @param questions - Questions to present.
 * @returns Answers keyed by question name.
 */
export const prompt: RequestPrompt = async <TAnswers extends object>(
  questions: PromptQuestion[],
): Promise<TAnswers> => {
  if (!autocompleteRegistered && questions.some(({ type }) => type === 'autocomplete')) {
    inquirer.registerPrompt('autocomplete', autoCompletePrompt);
    autocompleteRegistered = true;
  }
  return inquirer.prompt<TAnswers>(questions);
};

/** Default visual separator used between preferred and fallback choices. */
export const PROMPT_SEPARATOR: PromptSeparator = {
  type: 'separator',
  line: '──────────────',
};
