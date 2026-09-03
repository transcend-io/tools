/**
 * What the confirmation gate decides with: the routes to approval a connection
 * has, the codes it reports, and what came back from trying to ask a person.
 */

import { makeEnum } from '@transcend-io/type-utils';

import type { ApprovalTokenStore } from '../approval-tokens.js';

/** Why a gated call did not run, or what the caller must do next. */
export const ConfirmationCode = makeEnum({
  /** Form unavailable; approval token issued for replay */
  Required: 'CONFIRMATION_REQUIRED',
  /** User said no */
  Declined: 'CONFIRMATION_DECLINED',
  /** User dismissed the form */
  Cancelled: 'CONFIRMATION_CANCELLED',
  /** This connection may not approve gated calls at all */
  Unavailable: 'CONFIRMATION_UNAVAILABLE',
  /** Token unknown, expired, spent, or mismatched */
  TokenInvalid: 'CONFIRMATION_TOKEN_INVALID',
});

export type ConfirmationCode = (typeof ConfirmationCode)[keyof typeof ConfirmationCode];

/** How a transport is allowed to obtain a human's approval. */
export const ConfirmationPolicy = makeEnum({
  /** Elicit a decision from the host's user, falling back to a replayable token */
  ElicitOrToken: 'ELICIT_OR_TOKEN',
  /** Elicit on the originating call's own stream, with nothing to fall back on */
  ElicitOnly: 'ELICIT_ONLY',
  /** Never run the action, whatever the host says it can render */
  Refuse: 'REFUSE',
});

export type ConfirmationPolicy = (typeof ConfirmationPolicy)[keyof typeof ConfirmationPolicy];

/**
 * Which routes to approval this connection has, fixed by its transport.
 *
 * Settled before anything the host declared is consulted, so a connection with no
 * route cannot be talked into one. Whether a route reaches a real person is a
 * separate question — see `canObtainApproval`.
 */
export type ConfirmationGate =
  | {
      /** Elicit a decision, or issue a token if the host cannot show a form */
      policy: typeof ConfirmationPolicy.ElicitOrToken;
      /** Store backing the token fallback */
      tokens: ApprovalTokenStore;
    }
  | {
      /**
       * Elicit a decision, and refuse if that fails.
       *
       * A token here would be relayed by the very model the gate is interposing
       * on, since the agent lives on the far side of the transport. Requires the
       * prompt to be bound to its call — see `McpSession.request`.
       */
      policy: typeof ConfirmationPolicy.ElicitOnly;
    }
  | {
      /** Refuse every gated call on this connection */
      policy: typeof ConfirmationPolicy.Refuse;
    };

/** Why nobody was asked, which decides how the fallback describes itself. */
export const UnaskedReason = makeEnum({
  /** The host cannot show a form, or was asked and failed to */
  NoAnswer: 'NO_ANSWER',
  /**
   * The host answered so fast it cannot have shown the form to anybody.
   *
   * TODO: https://linear.app/transcend/issue/ZEL-8311 - remove when Cursor's
   * multi-window elicitation support is ready.
   *
   * Only reachable through the workaround in `cursor-decline-quirk.ts`, so this
   * member goes when that file does.
   */
  Undelivered: 'UNDELIVERED',
});

export type UnaskedReason = (typeof UnaskedReason)[keyof typeof UnaskedReason];

/** What came of trying to put the question to a person. */
export type AskOutcome =
  | {
      /** The user chose to proceed */
      outcome: 'confirmed';
    }
  | {
      /** The user answered, and the answer was no */
      outcome: 'refused';
      /** Structured refusal to return to the caller */
      result: unknown;
    }
  | {
      /** Nobody was asked: the host cannot show a form, or the request failed */
      outcome: 'unasked';
      /** Which of those it was, for the fallback's wording */
      reason: UnaskedReason;
    };
