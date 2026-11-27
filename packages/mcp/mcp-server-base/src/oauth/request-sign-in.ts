import { McpToolErrorCode } from '@transcend-io/privacy-types';

import { declineCameFromUndeliveredPrompt } from '../capabilities/cursor-decline-quirk.js';
import type { Logger } from '../clients/graphql/base.js';
import { ToolError } from '../errors.js';
import {
  getMcpSession,
  NO_ELICITATION_FIELDS,
  type requestElicitation,
} from '../mcp-session-context.js';
import { toolCallContext } from '../tool-call-context.js';
import {
  formatOAuthSignInPrompt,
  OAUTH_SIGN_IN_ABANDONED_AGENT_MESSAGE,
  OAUTH_SIGN_IN_PROMPT_TIMEOUT_MS,
} from './constants.js';

/** What came of asking the user to sign in. */
export enum SignInAnswer {
  /** The user accepted, so the browser may open */
  Accepted = 'ACCEPTED',
  /** The user declined or dismissed the prompt */
  Declined = 'DECLINED',
  /** Nobody was asked: the host cannot show the prompt, failed to, or declined it unseen */
  Unasked = 'UNASKED',
}

export interface RequestSignInOptions {
  /** Shows the prompt in the host; resolves `undefined` when the host cannot show one */
  elicit: typeof requestElicitation;
  /** Clock used to time the host's answer */
  now: () => number;
  /** Logger for a prompt the host failed to show */
  logger: Logger;
}

/**
 * Asks the user, through the host, whether to open the browser and sign in.
 *
 * Opens nothing itself. A browser window that appears without a click reads as
 * a hijack, so the caller opens one only on {@link SignInAnswer.Accepted}.
 */
export async function requestSignIn(options: RequestSignInOptions): Promise<SignInAnswer> {
  const { elicit, now, logger } = options;
  const askedAt = now();
  let answer: Awaited<ReturnType<typeof requestElicitation>>;
  try {
    answer = await elicit(
      formatOAuthSignInPrompt(toolCallContext.getStore()?.toolName),
      NO_ELICITATION_FIELDS,
      { timeout: OAUTH_SIGN_IN_PROMPT_TIMEOUT_MS },
    );
  } catch (error) {
    if (getMcpSession()?.request?.signal.aborted !== true) {
      logger.warn('Host failed to show the sign-in prompt', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return SignInAnswer.Unasked;
  }

  if (!answer) return SignInAnswer.Unasked;
  if (answer.action === 'accept') return SignInAnswer.Accepted;
  if (
    answer.action === 'decline' &&
    declineCameFromUndeliveredPrompt('the sign-in prompt', now() - askedAt)
  ) {
    return SignInAnswer.Unasked;
  }
  return SignInAnswer.Declined;
}

function abandonedError(): ToolError {
  return new ToolError(McpToolErrorCode.AuthError, OAUTH_SIGN_IN_ABANDONED_AGENT_MESSAGE, false);
}

/**
 * Throws when the caller of the current request already gave up on it.
 */
export function throwIfRequestAbandoned(): void {
  if (getMcpSession()?.request?.signal.aborted === true) throw abandonedError();
}

/**
 * Waits for a sign-in step on behalf of the current request, and stops waiting
 * when its caller cancels or times out. The step itself keeps running, so a
 * sign-in that outlives the request still completes for the next one.
 */
export async function waitUnlessRequestAbandoned<T>(step: Promise<T>): Promise<T> {
  const signal = getMcpSession()?.request?.signal;
  if (!signal) return step;
  throwIfRequestAbandoned();

  let onAbort: (() => void) | undefined;
  const abandoned = new Promise<never>((_resolve, reject) => {
    onAbort = () => reject(abandonedError());
    signal.addEventListener('abort', onAbort, { once: true });
  });
  try {
    return await Promise.race([step, abandoned]);
  } finally {
    if (onAbort) signal.removeEventListener('abort', onAbort);
  }
}
