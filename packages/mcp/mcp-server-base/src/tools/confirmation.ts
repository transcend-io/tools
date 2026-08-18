import type { ElicitRequestFormParams, ElicitResult } from '@modelcontextprotocol/sdk/types.js';
import { makeEnum } from '@transcend-io/type-utils';
import { z } from 'zod';

import { McpClientCapability, type ClientCapabilityReport } from '../capabilities/types.js';
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
 * separate question — see {@link canObtainApproval}.
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

/**
 * Whether a gated tool could actually be approved on this connection.
 *
 * Keeps tools that would refuse every call out of `tools/list`, so an agent does
 * not plan around one and spend a turn on a refusal it cannot act on. For the
 * model's benefit only: the gate still runs on every `tools/call` and remains the
 * boundary, since nothing stops a client calling a tool it was never shown.
 *
 * Under {@link ConfirmationPolicy.ElicitOnly} this trusts a capability the caller
 * declared about itself. A client can answer its own prompt, and nothing
 * server-side can tell that from a person clicking yes.
 */
export function canObtainApproval(
  /** What this connection is allowed to do to obtain approval */
  gate: ConfirmationGate,
  /** Capabilities the connected host declared */
  client: ClientCapabilityReport,
): boolean {
  switch (gate.policy) {
    // The token route needs nothing from the host, so a form-less one is fine.
    case ConfirmationPolicy.ElicitOrToken:
      return true;
    case ConfirmationPolicy.ElicitOnly:
      return client.capabilities.has(McpClientCapability.Elicitation);
    default:
      return false;
  }
}

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
type AskOutcome =
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
  const tokens = gate.policy === ConfirmationPolicy.ElicitOrToken ? gate.tokens : undefined;

  return {
    ...tool,
    zodSchema: tokens ? widenWithApprovalToken(tool) : tool.zodSchema,
    handler: async (raw: Record<string, unknown>) => {
      const { [APPROVAL_TOKEN_ARG]: replayed, ...args } = raw ?? {};

      if (typeof replayed === 'string') {
        return tokens
          ? await redeem(tool.name, args, replayed, tokens, mutate)
          : tokenNotIssued(tool.name);
      }

      // Policy before capability. Asking first would let a client decide whether
      // the restriction applies to it, which is backwards.
      if (gate.policy === ConfirmationPolicy.Refuse) return refusedByPolicy(tool.name, message);

      const asked = await askForConfirmation(tool.name, message, args, {
        // An unbound prompt lands on the connection's shared stream, where it can
        // surface in the wrong user's turn or go undelivered and silently expire.
        // stdio has one stream and a token to fall back on, so neither applies.
        requireBinding: gate.policy === ConfirmationPolicy.ElicitOnly,
      });
      if (asked.outcome === 'confirmed') return await mutate(args);
      if (asked.outcome === 'refused') return asked.result;

      return tokens
        ? mintApproval(tool.name, message, args, tokens)
        : refusedUnanswered(tool.name, message);
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
  options: {
    /** Whether to give up unless the form can be tied to the originating call */
    requireBinding: boolean;
  },
): Promise<AskOutcome> {
  if (!hasCapability(McpClientCapability.Elicitation)) return { outcome: 'unasked' };

  if (options.requireBinding && getMcpSession()?.request === undefined) {
    logger.warn(
      `Not asking for confirmation of ${toolName}: no originating call to bind the form to`,
    );
    return { outcome: 'unasked' };
  }

  const prompt = renderConfirmationPrompt(message, describeArgs(args));

  let answer: ElicitResult | undefined;
  try {
    answer = await requestElicitation(prompt, DECISION_SCHEMA, {
      timeout: CONFIRMATION_TIMEOUT_MS,
    });
  } catch (error) {
    const session = getMcpSession();
    if (session?.request?.signal.aborted === true) {
      // The caller gave up while the form was open, so nothing is wrong here — but
      // the answer that never arrived must not be treated as one.
      logger.debug(`Confirmation of ${toolName} abandoned by the caller`);
      return { outcome: 'unasked' };
    }
    // A warning rather than silence: the host said it could ask and then did not,
    // so whatever happens below is covering for a host-side problem someone may
    // need to fix.
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

/**
 * Refusal after the host was asked and produced no answer.
 *
 * Unlike {@link refusedByPolicy} the connection is allowed to ask, so the wording
 * avoids saying it never can. Not retryable: retrying is not what fixes a host
 * that cannot render the form.
 */
function refusedUnanswered(toolName: string, message: string): unknown {
  return createToolResult(
    false,
    undefined,
    `${message} Nothing has run. ${toolName} needs a person to approve it, and this ` +
      'client did not show them a confirmation to approve. Ask the user to run it from the ' +
      'Transcend admin dashboard.',
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
