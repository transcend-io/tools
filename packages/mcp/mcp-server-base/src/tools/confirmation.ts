import type { ElicitRequestFormParams, ElicitResult } from '@modelcontextprotocol/sdk/types.js';
import { makeEnum } from '@transcend-io/type-utils';
import { z } from 'zod';

import { McpClientCapability } from '../capabilities/types.js';
import { SimpleLogger } from '../clients/graphql/base.js';
import { getMcpSession, hasCapability, requestElicitation } from '../mcp-session-context.js';
import { ApprovalTokenOutcome, ApprovalTokenStore } from './approval-tokens.js';
import { describeArgs, type ConfirmationSummary } from './describe-args.js';
import { createToolResult } from './helpers.js';
import { assertConfirmableSchema, type ToolDefinition } from './types.js';

/** Replay arg for hosts that cannot render a confirmation form. */
export const APPROVAL_TOKEN_ARG = 'approvalToken';

/**
 * How long to leave a confirmation form open.
 *
 * The SDK's 60s default is a machine's deadline, not a person's: someone reading
 * what they are about to authorize routinely takes longer, and a timeout there
 * cancels the request while the dialog is still on their screen. Matches
 * {@link APPROVAL_TOKEN_TTL_MS} so both ways of asking allow the same window.
 */
export const CONFIRMATION_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Field name for the yes/no confirmation.
 *
 * A boolean rather than a titled `oneOf` select. Asked as a select, Cursor
 * answered `accept` with a value matching neither option's `const`, so the SDK
 * rejected the answer before the gate could read it and a rendered, answered
 * form still reached us as "nobody was asked". A checkbox is the narrowest
 * shape a host can get wrong.
 */
const DECISION_FIELD = 'confirmed';

const logger = new SimpleLogger();

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
  /** Ask the host's user, falling back to a replayable approval token */
  AskOrToken: 'ASK_OR_TOKEN',
  /** Never run the action, whatever the host says it can render */
  Refuse: 'REFUSE',
});

export type ConfirmationPolicy = (typeof ConfirmationPolicy)[keyof typeof ConfirmationPolicy];

/**
 * How this connection may obtain approval, decided by the transport rather than
 * by the caller.
 *
 * A declared capability is a claim by the party being gated: a client that says
 * it renders forms and then auto-answers has approved on the user's behalf. So
 * where a deployment must not perform gated actions at all — the HTTP sidecar,
 * where the caller is another service rather than a person at a keyboard — the
 * answer has to be {@link ConfirmationPolicy.Refuse}, checked before anything
 * the host declared is consulted.
 */
export type ConfirmationGate =
  | {
      /** Ask the user, or issue an approval token if the host cannot show a form */
      policy: typeof ConfirmationPolicy.AskOrToken;
      /** Store backing the token fallback */
      tokens: ApprovalTokenStore;
    }
  | {
      /** Refuse every gated call on this connection */
      policy: typeof ConfirmationPolicy.Refuse;
    };

const DECISION_SCHEMA: ElicitRequestFormParams['requestedSchema'] = {
  type: 'object',
  properties: {
    [DECISION_FIELD]: {
      type: 'boolean',
      title: 'Run this action',
      description:
        'Turn this on to carry out the action described above, or leave it off and ' +
        'submit to cancel without changing anything.',
      default: false,
    },
  },
  required: [DECISION_FIELD],
};

/** What came of trying to put the question to a person. */
type Ask =
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
    };

/** Hint plus arg recap for the elicitation form. */
export function renderConfirmationPrompt(
  /** Prose from the tool's `confirmation.hint` */
  message: string,
  /** Rendered recap of the pending call's arguments */
  summary: ConfirmationSummary,
): string {
  const lines = Object.entries(summary).map(([label, value]) => `- ${label}: ${value}`);
  return lines.length > 0 ? `${message}\n\n${lines.join('\n')}` : message;
}

/**
 * Run the handler only after a human approves. Applied after variant resolution.
 * Tools without `confirmation` are returned untouched.
 */
export function withConfirmation(
  /** Tool to gate, if it opted in */
  tool: ToolDefinition,
  /** What this connection is allowed to do to obtain approval */
  gate: ConfirmationGate,
): ToolDefinition {
  if (!tool.confirmation) return tool;

  const mutate = tool.handler;
  const message = tool.confirmation.hint;
  const tokens = gate.policy === ConfirmationPolicy.AskOrToken ? gate.tokens : undefined;

  return {
    ...tool,
    zodSchema: tokens ? widenWithApprovalToken(tool) : tool.zodSchema,
    handler: async (raw: Record<string, unknown>) => {
      const { [APPROVAL_TOKEN_ARG]: replayed, ...args } = raw ?? {};

      // Policy before capability. Asking first would let a client decide whether
      // the restriction applies to it, which is backwards.
      if (!tokens) {
        return typeof replayed === 'string'
          ? tokenNotIssued(tool.name)
          : refusedByPolicy(tool.name, message);
      }

      if (typeof replayed === 'string') {
        return await redeem(tool.name, args, replayed, tokens, mutate);
      }

      const asked = await askForConfirmation(tool.name, message, args);
      if (asked.outcome === 'confirmed') return await mutate(args);
      if (asked.outcome === 'refused') return asked.result;

      return mintApproval(tool.name, message, args, tokens);
    },
  };
}

/**
 * Puts the question to the host's user.
 *
 * Every failure collapses to `unasked` on purpose: from here, a host that never
 * declared elicitation, one that rejects the request, and one that answers with
 * something the SDK refuses are the same situation — nobody said yes — and the
 * caller has a fallback for exactly that.
 */
async function askForConfirmation(
  /** Tool being gated, for the log line */
  toolName: string,
  /** Prose from the tool's `confirmation.hint` */
  message: string,
  /** Arguments of the pending call, recapped for the user */
  args: Record<string, unknown>,
): Promise<Ask> {
  if (!hasCapability(McpClientCapability.Elicitation)) return { outcome: 'unasked' };

  const prompt = renderConfirmationPrompt(message, describeArgs(args));

  let answer: ElicitResult | undefined;
  try {
    answer = await requestElicitation(prompt, DECISION_SCHEMA, {
      timeout: CONFIRMATION_TIMEOUT_MS,
    });
  } catch (error) {
    // A warning rather than silence: the host said it could ask and then did not,
    // so the token fallback below is covering for a host-side problem someone may
    // need to fix.
    const session = getMcpSession();
    logger.warn(`Host failed to show the confirmation form for ${toolName}`, {
      error: error instanceof Error ? error.message : String(error),
      host: session?.client.host,
      clientName: session?.client.clientInfo?.name,
    });
    return { outcome: 'unasked' };
  }

  if (!answer) return { outcome: 'unasked' };

  if (answer.action === 'cancel') {
    return {
      outcome: 'refused',
      result: refused(ConfirmationCode.Cancelled, 'dismissed the confirmation prompt'),
    };
  }
  if (answer.action === 'decline') {
    return {
      outcome: 'refused',
      result: refused(ConfirmationCode.Declined, 'declined the action'),
    };
  }

  const confirmed = (answer.content as Record<string, unknown> | undefined)?.[DECISION_FIELD];
  if (confirmed !== true) {
    return {
      outcome: 'refused',
      result: refused(ConfirmationCode.Declined, 'did not confirm the action'),
    };
  }

  return { outcome: 'confirmed' };
}

/** Hand the agent a token to replay once it has the user's agreement. */
function mintApproval(
  /** Tool the approval is bound to */
  toolName: string,
  /** Prose from the tool's `confirmation.hint` */
  message: string,
  /** Arguments the approval is bound to */
  args: Record<string, unknown>,
  /** Store issuing the approval */
  tokens: ApprovalTokenStore,
): unknown {
  const { token, expiresAt } = tokens.mint(toolName, args);
  return createToolResult(
    false,
    undefined,
    `${message} This host cannot show a confirmation form, so nothing has run yet. ` +
      `Show the pending call arguments to the user, and only if they agree, call ` +
      `${toolName} again with the same arguments plus ${APPROVAL_TOKEN_ARG}.`,
    {
      code: ConfirmationCode.Required,
      retryable: false,
      details: {
        [APPROVAL_TOKEN_ARG]: token,
        expiresAt: new Date(expiresAt).toISOString(),
      },
    },
  );
}

/**
 * Refusal on a connection that may not approve gated calls. Permanent for the
 * deployment, so it points somewhere the user can actually do the thing rather
 * than suggesting they retry.
 */
function refusedByPolicy(toolName: string, message: string): unknown {
  return createToolResult(
    false,
    undefined,
    `${message} Nothing has run. ${toolName} needs a person to approve it, and this ` +
      'connection has no way to ask one, so it is unavailable here. Ask the user to run it ' +
      'from the Transcend admin dashboard.',
    { code: ConfirmationCode.Unavailable, retryable: false },
  );
}

function tokenNotIssued(toolName: string): unknown {
  return createToolResult(
    false,
    undefined,
    `${toolName} was called with an ${APPROVAL_TOKEN_ARG}, but this connection cannot ` +
      `approve ${toolName} at all. Approval tokens are only issued over the stdio transport.`,
    { code: ConfirmationCode.TokenInvalid, retryable: false },
  );
}

async function redeem(
  toolName: string,
  args: Record<string, unknown>,
  token: string,
  tokens: ApprovalTokenStore,
  mutate: (args: unknown) => Promise<unknown>,
): Promise<unknown> {
  const expiresAt = tokens.expiryOf(token);
  const outcome = tokens.claim(toolName, args, token);
  if (outcome !== ApprovalTokenOutcome.Claimed) {
    return createToolResult(false, undefined, explainTokenFailure(toolName, outcome), {
      code: ConfirmationCode.TokenInvalid,
      retryable: false,
      details: { reason: outcome },
    });
  }

  try {
    return await mutate(args);
  } catch (error) {
    // Upstream failure should not cost a second confirmation.
    if (expiresAt !== undefined) tokens.restore(token, toolName, args, expiresAt);
    throw error;
  }
}

function explainTokenFailure(toolName: string, outcome: ApprovalTokenOutcome): string {
  switch (outcome) {
    case ApprovalTokenOutcome.Expired:
      return `The approval for ${toolName} has expired. Ask the user to confirm again, then retry with the new ${APPROVAL_TOKEN_ARG}.`;
    case ApprovalTokenOutcome.Mismatch:
      return `The approval replayed for ${toolName} was not issued for this call — either the arguments differ from the ones approved, or the credentials do. Call ${toolName} again without an ${APPROVAL_TOKEN_ARG} to request a fresh confirmation.`;
    default:
      return `The approval replayed for ${toolName} is not valid — it may already have been used, or the server may have restarted. Call ${toolName} again without an ${APPROVAL_TOKEN_ARG} to request a fresh confirmation.`;
  }
}

/** Structured success:false so agents do not treat a refusal as a retryable error. */
function refused(code: ConfirmationCode, what: string): unknown {
  return createToolResult(false, undefined, `The user ${what}. Nothing was changed.`, {
    code,
    retryable: false,
  });
}

function widenWithApprovalToken(tool: ToolDefinition): z.ZodType<unknown> {
  assertConfirmableSchema(tool.name, tool.zodSchema);
  if (APPROVAL_TOKEN_ARG in tool.zodSchema.shape) {
    throw new Error(
      `Tool "${tool.name}" requires confirmation but already defines a "${APPROVAL_TOKEN_ARG}" ` +
        'input field. The confirmation gate owns that name — rename the field.',
    );
  }
  return tool.zodSchema.extend({
    [APPROVAL_TOKEN_ARG]: z
      .string()
      .optional()
      .describe(
        'Approval token from a previous confirmation_required response for this exact ' +
          'call. Omit it on the first call. Only send it back after the user has agreed ' +
          'to the pending action; it is single-use and expires shortly.',
      ),
  });
}
