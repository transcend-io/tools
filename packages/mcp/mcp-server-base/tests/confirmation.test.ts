/**
 * What the confirmation gate does with every way a host can answer.
 *
 * Every case asserts on the business handler rather than only the response,
 * because the property under test is that the mutation did not run — a refusal
 * that still mutated would look identical from the outside.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ElicitRequestSchema, type ElicitResult } from '@modelcontextprotocol/sdk/types.js';
import { describe, expect, it, vi } from 'vitest';

import {
  McpClientCapability,
  McpHostClient,
  type ClientCapabilityReport,
} from '../src/capabilities/types.js';
import { mcpSessionContext, type McpSession } from '../src/mcp-session-context.js';
import { MCP_SKIP_CONFIRMATION_ENV } from '../src/oauth/env.js';
import { buildMcpServer } from '../src/server/build-server.js';
import { ApprovalTokenStore } from '../src/tools/approval-tokens.js';
import {
  APPROVAL_TOKEN_ARG,
  canObtainApproval,
  CONFIRMATION_TIMEOUT_MS,
  ConfirmationCode,
  ConfirmationPolicy,
  withConfirmation,
  type ConfirmationGate,
} from '../src/tools/confirmation.js';
import {
  defineToolWithCapabilities,
  expandToolsForClient,
} from '../src/tools/define-tool-with-capabilities.js';
import { defineTool, type ToolDefinition } from '../src/tools/types.js';
import { defineUiResource } from '../src/tools/ui-resource.js';
import { z } from '../src/validation/index.js';

/** Shape `createToolResult` produces for a refusal. */
interface Refusal {
  /** Always false for a refusal */
  success: false;
  /** Human-readable explanation */
  error: string;
  /** Machine-readable confirmation outcome */
  code: string;
  /** Recap and approval token, present only where the caller needs them */
  details?: {
    /** Recap of the pending action, relayed to the user by the agent */
    summary?: Record<string, unknown>;
    /** Token to replay, present only on the fallback path */
    approvalToken?: string;
    /** When the token stops being redeemable */
    expiresAt?: string;
    /** Why a replayed token was refused */
    reason?: string;
  };
}

const CANCEL_SCHEMA = z.object({
  requestId: z.string().describe('ID of the request to cancel'),
  reason: z.string().optional().describe('Why the request is being cancelled'),
});

function gatedTool(mutate: (args: unknown) => Promise<unknown>): ToolDefinition {
  return defineTool({
    name: 'test_cancel',
    description: 'Cancel something, but only once a human has agreed to it.',
    category: 'test',
    readOnly: false,
    confirmation: { hint: 'This permanently cancels the request.' },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    zodSchema: CANCEL_SCHEMA,
    handler: mutate,
  });
}

/** A stdio-shaped gate: ask the user, fall back to a token. */
function askOrToken(tokens = new ApprovalTokenStore()): ConfirmationGate {
  return { policy: ConfirmationPolicy.ElicitOrToken, tokens };
}

/** The embedded gate: no approval is obtainable on this connection at all. */
const REFUSING: ConfirmationGate = { policy: ConfirmationPolicy.Refuse };

/** An HTTP-shaped gate: the caller's user may be asked, with no token fallback. */
const ASKING: ConfirmationGate = { policy: ConfirmationPolicy.ElicitOnly };

/** Id of the `tools/call` the simulated session is serving. */
const CALL_ID = 42;

/** Runs a gated tool the way the server would, against a scripted host. */
async function callAs(
  options: {
    /** Capabilities the simulated host declares */
    capabilities?: McpClientCapability[];
    /** Answer the host gives to the confirmation form */
    answer?: ElicitResult;
    /** How the host fails the elicitation, instead of answering it */
    elicitError?: Error;
    /** Gate configuration, i.e. what this connection may do to get approval */
    gate?: ConfirmationGate;
    /** Arguments the agent supplied */
    args?: Record<string, unknown>;
    /** Stand-in for the business handler */
    mutate?: (args: unknown) => Promise<unknown>;
    /**
     * Whether the session knows which call it is serving. False stands in for a
     * context the server cannot address a form to, such as `tools/list`.
     */
    bound?: boolean;
  } = {},
): Promise<{
  /** Whatever the gated handler returned */
  result: unknown;
  /** Spy wrapping the business handler */
  mutate: ReturnType<typeof vi.fn>;
  /** Spy wrapping the host's elicitation endpoint */
  elicitInput: ReturnType<typeof vi.fn>;
}> {
  const mutate = vi.fn(options.mutate ?? (async () => ({ cancelled: true })));
  const elicitInput = options.elicitError
    ? vi.fn().mockRejectedValue(options.elicitError)
    : vi.fn().mockResolvedValue(options.answer ?? { action: 'accept', content: {} });

  const session: McpSession = {
    client: {
      capabilities: new Set(options.capabilities ?? []),
      host: McpHostClient.Claude,
    },
    server: { elicitInput } as unknown as Server,
    ...(options.bound !== false && {
      request: { id: CALL_ID, signal: new AbortController().signal },
    }),
  };

  const gated = withConfirmation(gatedTool(mutate), options.gate ?? askOrToken());
  const args = options.args ?? { requestId: 'req-1' };
  const result = await mcpSessionContext.run(session, async () => gated.handler(args));

  return { result, mutate, elicitInput };
}

const ELICITATION = [McpClientCapability.Elicitation];

describe('withConfirmation on a host that can show a form', () => {
  it('runs the mutation once the user confirms', async () => {
    const { result, mutate, elicitInput } = await callAs({ capabilities: ELICITATION });

    expect(elicitInput).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith({ requestId: 'req-1' });
    expect(result).toEqual({ cancelled: true });
  });

  it('allows a person time to read before answering', async () => {
    // The SDK default is 60s, which cancels the request while the dialog is still
    // on screen and leaves the user believing they approved something.
    const { elicitInput } = await callAs({ capabilities: ELICITATION });

    expect(elicitInput.mock.calls[0]![1]).toMatchObject({ timeout: CONFIRMATION_TIMEOUT_MS });
    expect(CONFIRMATION_TIMEOUT_MS).toBeGreaterThan(60_000);
  });

  it('shows the hint and a recap of the arguments in the prompt', async () => {
    const { elicitInput } = await callAs({
      capabilities: ELICITATION,
      args: { requestId: 'req-1', reason: 'duplicate' },
    });

    // The host renders this text verbatim, so it is the one description of the
    // action that reaches the user without the agent being able to rewrite it.
    const { message } = elicitInput.mock.calls[0]![0] as { message: string };
    expect(message).toContain('This permanently cancels the request.');
    expect(message).toContain('requestId: req-1');
    expect(message).toContain('reason: duplicate');
  });

  it('leaves omitted optional arguments out of the recap', async () => {
    const { elicitInput } = await callAs({ capabilities: ELICITATION });

    const { message } = elicitInput.mock.calls[0]![0] as { message: string };
    expect(message).toContain('requestId: req-1');
    expect(message).not.toContain('reason');
  });

  it('does not mutate when the user declines', async () => {
    const { result, mutate } = await callAs({
      capabilities: ELICITATION,
      answer: { action: 'decline' },
    });

    expect(mutate).not.toHaveBeenCalled();
    expect((result as Refusal).code).toBe(ConfirmationCode.Declined);
  });

  it('does not mutate when the user dismisses the prompt', async () => {
    const { result, mutate } = await callAs({
      capabilities: ELICITATION,
      answer: { action: 'cancel' },
    });

    expect(mutate).not.toHaveBeenCalled();
    expect((result as Refusal).code).toBe(ConfirmationCode.Cancelled);
  });

  it('mutates on accept whatever the host puts in content', async () => {
    // Accepting is the yes. The form requests no fields, so a host is free to
    // answer with nothing, or with fields it invented, without that reading as a
    // refusal — which is how a real approval twice came back as one.
    const answers: Record<string, string | number | boolean | string[]>[] = [
      {},
      { confirmed: false },
      { confirmed: 'yes' },
    ];
    for (const content of answers) {
      const { mutate } = await callAs({
        capabilities: ELICITATION,
        answer: { action: 'accept', content },
      });

      expect(mutate, JSON.stringify(content)).toHaveBeenCalledTimes(1);
    }
  });

  it('reports a refusal as a structured result rather than an error', async () => {
    // An agent that reads a decline as a failure will simply try again.
    const { result } = await callAs({
      capabilities: ELICITATION,
      answer: { action: 'decline' },
    });

    const refusal = result as Refusal;
    expect(refusal.success).toBe(false);
    expect(refusal.error).toContain('Nothing was changed');
    // No recap on a decline: the agent supplied these arguments and still has
    // them, so echoing them back is context spent to tell it what it knows.
    expect(refusal.details?.summary).toBeUndefined();
  });
});

describe('withConfirmation on a host that cannot show a form', () => {
  it('refuses outright when there is no token fallback', async () => {
    const { result, mutate, elicitInput } = await callAs({ gate: REFUSING });

    expect(elicitInput).not.toHaveBeenCalled();
    expect(mutate).not.toHaveBeenCalled();
    expect((result as Refusal).code).toBe(ConfirmationCode.Unavailable);
  });

  it('mints a token instead of mutating when the fallback is available', async () => {
    const { result, mutate } = await callAs({ gate: askOrToken() });

    expect(mutate).not.toHaveBeenCalled();
    const refusal = result as Refusal;
    expect(refusal.code).toBe(ConfirmationCode.Required);
    expect(refusal.details?.approvalToken).toEqual(expect.any(String));
    // No recap in the refusal: the agent already holds the call arguments and is
    // told to show those to the user. Echoing a collapsed summary just spends
    // context and, for arrays of objects, loses the detail that mattered.
    expect(refusal.details?.summary).toBeUndefined();
  });

  it('mutates on the second call, with the token stripped from the arguments', async () => {
    const tokens = new ApprovalTokenStore();
    const first = await callAs({ gate: askOrToken(tokens) });
    const token = (first.result as Refusal).details!.approvalToken!;

    const second = await callAs({
      gate: askOrToken(tokens),
      args: { requestId: 'req-1', [APPROVAL_TOKEN_ARG]: token },
    });

    expect(second.mutate).toHaveBeenCalledWith({ requestId: 'req-1' });
    expect(second.result).toEqual({ cancelled: true });
  });

  it('refuses a replayed token the second time around', async () => {
    const tokens = new ApprovalTokenStore();
    const first = await callAs({ gate: askOrToken(tokens) });
    const token = (first.result as Refusal).details!.approvalToken!;
    const args = { requestId: 'req-1', [APPROVAL_TOKEN_ARG]: token };

    await callAs({ gate: askOrToken(tokens), args });
    const replayed = await callAs({ gate: askOrToken(tokens), args });

    expect(replayed.mutate).not.toHaveBeenCalled();
    expect((replayed.result as Refusal).code).toBe(ConfirmationCode.TokenInvalid);
  });

  it('refuses a token replayed against different arguments', async () => {
    const tokens = new ApprovalTokenStore();
    const first = await callAs({ gate: askOrToken(tokens) });
    const token = (first.result as Refusal).details!.approvalToken!;

    const swapped = await callAs({
      gate: askOrToken(tokens),
      args: { requestId: 'req-2', [APPROVAL_TOKEN_ARG]: token },
    });

    expect(swapped.mutate).not.toHaveBeenCalled();
    expect((swapped.result as Refusal).details?.reason).toBe('MISMATCH');
  });

  it('keeps the approval usable when the mutation itself fails', async () => {
    const tokens = new ApprovalTokenStore();
    const first = await callAs({ gate: askOrToken(tokens) });
    const token = (first.result as Refusal).details!.approvalToken!;
    const args = { requestId: 'req-1', [APPROVAL_TOKEN_ARG]: token };

    await expect(
      callAs({
        gate: askOrToken(tokens),
        args,
        mutate: async () => {
          throw new Error('upstream exploded');
        },
      }),
    ).rejects.toThrow('upstream exploded');

    // The user already agreed to this exact action, so a transient upstream
    // failure should not cost them a second confirmation.
    const retried = await callAs({ gate: askOrToken(tokens), args });
    expect(retried.mutate).toHaveBeenCalledWith({ requestId: 'req-1' });
  });

  it('rejects a token on a connection that never issues them', async () => {
    const { result, mutate } = await callAs({
      gate: REFUSING,
      args: { requestId: 'req-1', [APPROVAL_TOKEN_ARG]: 'smuggled' },
    });

    expect(mutate).not.toHaveBeenCalled();
    expect((result as Refusal).code).toBe(ConfirmationCode.TokenInvalid);
  });

  it('dates the approval in a form a person can read', async () => {
    const { result } = await callAs({ gate: askOrToken() });

    // The agent relays this to a user, so an epoch integer is the wrong unit.
    const { expiresAt } = (result as Refusal).details!;
    expect(new Date(expiresAt as string).toISOString()).toBe(expiresAt);
  });
});

describe('a refusing connection does not consult the host', () => {
  // The capability is a claim by the party being restricted: a client that says
  // it renders forms and then answers its own prompt has approved on the user's
  // behalf. So where the deployment must not run gated actions at all, what the
  // host declared cannot enter into it.
  it('ignores a declared elicitation capability entirely', async () => {
    const { result, mutate, elicitInput } = await callAs({
      capabilities: ELICITATION,
      answer: { action: 'accept', content: {} },
      gate: REFUSING,
    });

    expect(elicitInput).not.toHaveBeenCalled();
    expect(mutate).not.toHaveBeenCalled();
    expect((result as Refusal).code).toBe(ConfirmationCode.Unavailable);
  });

  it('points at somewhere the action can actually be performed', async () => {
    // Permanent for the deployment, so "try a different client" is not the advice
    // to give: the user needs a route that exists.
    const { result } = await callAs({ capabilities: ELICITATION, gate: REFUSING });

    expect((result as Refusal).error).toMatch(/dashboard/i);
    expect((result as Refusal).error).not.toMatch(/try again|retry/i);
  });
});

describe('a connection that may ask but has no token fallback', () => {
  // The HTTP deployment: its caller can put the form to a user, so refusing outright
  // would make every gated tool dead weight. What it must not get is the token, since
  // the only thing there to carry one back is the agent being gated.
  it('runs the mutation once the user confirms', async () => {
    const { result, mutate, elicitInput } = await callAs({
      capabilities: ELICITATION,
      gate: ASKING,
    });

    expect(elicitInput).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith({ requestId: 'req-1' });
    expect(result).toEqual({ cancelled: true });
  });

  it('binds the form to the call being served', async () => {
    const { elicitInput } = await callAs({ capabilities: ELICITATION, gate: ASKING });

    expect(elicitInput.mock.calls[0]![1]).toMatchObject({ relatedRequestId: CALL_ID });
  });

  it('does not mutate when the user declines', async () => {
    const { result, mutate } = await callAs({
      capabilities: ELICITATION,
      answer: { action: 'decline' },
      gate: ASKING,
    });

    expect(mutate).not.toHaveBeenCalled();
    expect((result as Refusal).code).toBe(ConfirmationCode.Declined);
  });

  it('refuses without a token when the host cannot show a form', async () => {
    const { result, mutate, elicitInput } = await callAs({ gate: ASKING });

    expect(elicitInput).not.toHaveBeenCalled();
    expect(mutate).not.toHaveBeenCalled();
    const refusal = result as Refusal;
    expect(refusal.code).toBe(ConfirmationCode.Unavailable);
    expect(refusal.details?.approvalToken).toBeUndefined();
  });

  it('refuses without a token when the host fails the request', async () => {
    const { result, mutate } = await callAs({
      capabilities: ELICITATION,
      elicitError: new Error('host refused to render the form'),
      gate: ASKING,
    });

    expect(mutate).not.toHaveBeenCalled();
    const refusal = result as Refusal;
    expect(refusal.code).toBe(ConfirmationCode.Unavailable);
    expect(refusal.details?.approvalToken).toBeUndefined();
  });

  it('will not ask at all when the form cannot be tied to a call', async () => {
    // An unbound form goes to the shared stream: undelivered it is stored for replay
    // and never sent, so the call hangs the full ten minutes and refuses anyway, and
    // delivered it can be answered from a different user's turn.
    const { result, mutate, elicitInput } = await callAs({
      capabilities: ELICITATION,
      gate: ASKING,
      bound: false,
    });

    expect(elicitInput).not.toHaveBeenCalled();
    expect(mutate).not.toHaveBeenCalled();
    expect((result as Refusal).code).toBe(ConfirmationCode.Unavailable);
  });

  it('still asks an unbound stdio host, which has one stream and a fallback', async () => {
    const { mutate, elicitInput } = await callAs({
      capabilities: ELICITATION,
      gate: askOrToken(),
      bound: false,
    });

    expect(elicitInput).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith({ requestId: 'req-1' });
  });

  it('rejects a smuggled approval token', async () => {
    const { result, mutate, elicitInput } = await callAs({
      capabilities: ELICITATION,
      gate: ASKING,
      args: { requestId: 'req-1', [APPROVAL_TOKEN_ARG]: 'smuggled' },
    });

    expect(elicitInput).not.toHaveBeenCalled();
    expect(mutate).not.toHaveBeenCalled();
    expect((result as Refusal).code).toBe(ConfirmationCode.TokenInvalid);
  });

  it('never advertises approvalToken in its input schema', () => {
    const gated = withConfirmation(gatedTool(vi.fn()), ASKING);

    expect(gated.zodSchema.parse({ requestId: 'r', approvalToken: 'x' })).toEqual({
      requestId: 'r',
    });
  });

  it('does not tell the user their connection can never ask', async () => {
    // Distinct from the refusing policy: asking is allowed here and simply did not
    // work, so claiming it can never ask would send someone debugging the wrong thing.
    const { result } = await callAs({ gate: ASKING });

    expect((result as Refusal).error).toMatch(/did not show/i);
    expect((result as Refusal).error).not.toMatch(/no way to ask/i);
  });
});

describe('a host that declared elicitation but fails the request', () => {
  // Declaring the capability is not a promise to honor it. The SDK rejects when
  // the host errors, when nobody answers inside the timeout, and when the answer
  // does not validate against the requested schema — all of which mean no one
  // said yes, so the fallback has to cover them.
  const FAILURES = [
    { name: 'host errors', error: new Error('client does not support form elicitation') },
    { name: 'nobody answers in time', error: new Error('MCP error -32001: Request timed out') },
    {
      name: 'answer fails schema validation',
      error: new Error(
        'MCP error -32602: Elicitation response content does not match requested schema',
      ),
    },
  ];

  it.each(FAILURES)('falls back to a token when the $name', async (failure) => {
    const { result, mutate } = await callAs({
      capabilities: ELICITATION,
      elicitError: failure.error,
      gate: askOrToken(),
    });

    expect(mutate).not.toHaveBeenCalled();
    const refusal = result as Refusal;
    expect(refusal.code).toBe(ConfirmationCode.Required);
    expect(refusal.details?.approvalToken).toEqual(expect.any(String));
  });

  it('refuses rather than erroring when there is no fallback either', async () => {
    const { result, mutate } = await callAs({
      capabilities: ELICITATION,
      elicitError: new Error('client does not support form elicitation'),
      gate: REFUSING,
    });

    expect(mutate).not.toHaveBeenCalled();
    expect((result as Refusal).code).toBe(ConfirmationCode.Unavailable);
  });
});

describe('a gated tool may not also carry a view', () => {
  // The gate runs before the handler, but an MCP App view renders from what the
  // handler returned. So on an Apps host a view cannot be what asks the user, and
  // allowing the pair would mean the same `confirmation` line silently stopped
  // applying on the most capable hosts. Both ways of attaching a view are refused
  // at construction, since no runtime signal exists to check a view against.
  const GATED = {
    confirmation: { hint: 'This permanently cancels the request.' },
  } as const;

  const VIEW = defineUiResource({
    uri: 'ui://test/cancel',
    name: 'Cancel view',
    html: '<!DOCTYPE html><html><body>cancel</body></html>',
  });

  it('refuses a ui binding on a plain gated tool', () => {
    expect(() =>
      defineTool({
        name: 'test_cancel',
        description: 'Cancel something, rendering the outcome in a view.',
        category: 'test',
        readOnly: false,
        annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
        ...GATED,
        zodSchema: CANCEL_SCHEMA,
        handler: async () => ({}),
        ui: { resource: VIEW },
      }),
    ).toThrow(/declares confirmation and an MCP App view/);
  });

  it('refuses an MCP App variant on a gated capability-aware tool', () => {
    expect(() =>
      defineToolWithCapabilities({
        name: 'test_cancel',
        description: 'Cancel something, adapting to the host that called it.',
        category: 'test',
        readOnly: false,
        annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
        ...GATED,
        zodSchema: CANCEL_SCHEMA,
        handler: async () => ({}),
        variants: {
          [McpClientCapability.McpApp]: { resource: VIEW, handler: async () => ({}) },
        },
      }),
    ).toThrow(/declares confirmation and an MCP App variant/);
  });

  it('points the author at the preview-plus-apply split', () => {
    expect(() =>
      defineTool({
        name: 'test_cancel',
        description: 'Cancel something, rendering the outcome in a view.',
        category: 'test',
        readOnly: false,
        annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
        ...GATED,
        zodSchema: CANCEL_SCHEMA,
        handler: async () => ({}),
        ui: { resource: VIEW },
      }),
    ).toThrow(/appOnlyTool the view calls once the user clicks/);
  });

  it('still allows an elicitation variant, which the gate runs before', async () => {
    const form = vi.fn().mockResolvedValue({ ok: true });
    const tool = defineToolWithCapabilities({
      name: 'test_cancel',
      description: 'Cancel something, collecting the missing details via a form.',
      category: 'test',
      readOnly: false,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
      ...GATED,
      zodSchema: CANCEL_SCHEMA,
      handler: async () => ({}),
      variants: {
        [McpClientCapability.Elicitation]: {
          elicitMessage: 'Which request?',
          elicitSchema: {
            type: 'object',
            properties: {
              requestId: { type: 'string', description: 'ID of the request to cancel' },
            },
            required: ['requestId'],
          },
          handler: form,
        },
      },
    });

    const client = { capabilities: new Set(ELICITATION), host: McpHostClient.Claude };
    const resolved = expandToolsForClient([tool], client, askOrToken()).find(
      (t) => t.name === 'test_cancel',
    )!;

    await mcpSessionContext.run(
      {
        client,
        server: {
          elicitInput: vi.fn().mockResolvedValue({ action: 'decline' }),
        } as unknown as Server,
      },
      async () => resolved.handler({ requestId: 'req-1' }),
    );

    expect(form).not.toHaveBeenCalled();
  });
});

describe('confirmation and the protocol annotations agree', () => {
  /** Builds a gated tool with the given annotations, to check the constraint. */
  function gatedWith(annotations: {
    /** Whether the tool claims to only read */
    readOnlyHint: boolean;
    /** Whether the tool claims it can cause irreversible change */
    destructiveHint: boolean;
  }): () => ToolDefinition {
    return () =>
      defineTool({
        name: 'test_cancel',
        description: 'Cancel something that the caller should have to agree to first.',
        category: 'test',
        readOnly: annotations.readOnlyHint,
        confirmation: { hint: 'This permanently cancels the request.' },
        annotations: { ...annotations, idempotentHint: false },
        zodSchema: CANCEL_SCHEMA,
        handler: async () => ({}),
      });
  }

  it('refuses a gated tool that calls itself read-only', () => {
    expect(gatedWith({ readOnlyHint: true, destructiveHint: true })).toThrow(
      /annotates readOnlyHint: true/,
    );
  });

  it('accepts a gated tool that calls itself non-destructive', () => {
    // confirmation gates the server-side handler; destructiveHint is a separate
    // host advisory for how loudly to warn on paths that do not run the gate.
    expect(gatedWith({ readOnlyHint: false, destructiveHint: false })).not.toThrow();
  });

  it('accepts a gated tool that calls itself destructive and mutating', () => {
    expect(gatedWith({ readOnlyHint: false, destructiveHint: true })).not.toThrow();
  });
});

describe('the token fallback appears only where nothing else can ask', () => {
  /** Each host, and whether it should ever see an approval token. */
  const HOSTS = [
    { name: 'no capabilities', capabilities: [] as McpClientCapability[], mintsToken: true },
    { name: 'elicitation', capabilities: ELICITATION, mintsToken: false },
    { name: 'MCP Apps only', capabilities: [McpClientCapability.McpApp], mintsToken: true },
    {
      name: 'MCP Apps and elicitation',
      capabilities: [McpClientCapability.McpApp, McpClientCapability.Elicitation],
      mintsToken: false,
    },
  ];

  it.each(HOSTS)('$name', async (host) => {
    // A gated tool can never carry a view, so an Apps host has no view to confirm
    // in and the token is still the right answer there. What the Apps capability
    // buys is only relevant to tools that actually have a view, and those are
    // never gated.
    const mutate = vi.fn().mockResolvedValue({ ok: true });
    const client = { capabilities: new Set(host.capabilities), host: McpHostClient.Claude };
    const resolved = expandToolsForClient([gatedTool(mutate)], client, askOrToken())[0];

    const result = await mcpSessionContext.run(
      {
        client,
        server: {
          elicitInput: vi.fn().mockResolvedValue({ action: 'accept', content: {} }),
        } as unknown as Server,
      },
      async () => resolved.handler({ requestId: 'req-1' }),
    );

    if (host.mintsToken) {
      expect((result as Refusal).code).toBe(ConfirmationCode.Required);
      expect(mutate).not.toHaveBeenCalled();
    } else {
      expect(mutate).toHaveBeenCalledWith({ requestId: 'req-1' });
    }
  });
});

describe('canObtainApproval', () => {
  /** A capability report for a host declaring exactly these capabilities. */
  function host(...capabilities: McpClientCapability[]): ClientCapabilityReport {
    return { capabilities: new Set(capabilities), host: McpHostClient.Claude };
  }

  const CASES = [
    { gate: 'stdio, form-less host', gateValue: askOrToken(), client: host(), expected: true },
    {
      gate: 'stdio, host with forms',
      gateValue: askOrToken(),
      client: host(...ELICITATION),
      expected: true,
    },
    {
      gate: 'http, host with forms',
      gateValue: ASKING,
      client: host(...ELICITATION),
      expected: true,
    },
    { gate: 'http, form-less host', gateValue: ASKING, client: host(), expected: false },
    {
      gate: 'http, MCP Apps but no forms',
      gateValue: ASKING,
      client: host(McpClientCapability.McpApp),
      expected: false,
    },
    {
      gate: 'embedded, host with forms',
      gateValue: REFUSING,
      client: host(...ELICITATION),
      expected: false,
    },
  ];

  it.each(CASES)('$gate → $expected', ({ gateValue, client, expected }) => {
    expect(canObtainApproval(gateValue, client)).toBe(expected);
  });
});

describe('the gate against a real SDK server', () => {
  /**
   * The cases above script `elicitInput` directly, which skips what the SDK does
   * around it: `Server.elicitInput` validates the host's answer against the schema
   * it sent and rejects on a mismatch. So "the host answered oddly" reaches the
   * gate as a thrown `McpError`, not as a value — only a real server and client
   * can show which of those the gate is actually handling.
   */
  async function callOverTransport(
    respond: () => Promise<ElicitResult>,
    transport: 'stdio' | 'http' = 'stdio',
    declaresElicitation = true,
  ): Promise<{
    /** Parsed tool result payload */
    payload: Refusal & { success: boolean };
    /** Whether the call came back as a protocol-level error */
    isError: boolean;
    /** Names the client saw in `tools/list` */
    listed: string[];
    /** Spy standing in for the business handler */
    mutate: ReturnType<typeof vi.fn>;
    /** Spy wrapping the host's elicitation handler */
    asked: ReturnType<typeof vi.fn>;
  }> {
    const mutate = vi.fn().mockResolvedValue({ cancelled: true });
    const asked = vi.fn(respond);
    const server = buildMcpServer({
      name: 'confirmation-probe',
      version: '0.0.1',
      tools: [{ ...gatedTool(mutate), requireAuth: false }],
      transport,
    });

    const client = new Client(
      { name: 'cursor', version: '1.0.0' },
      { capabilities: declaresElicitation ? { elicitation: { form: {} } } : {} },
    );
    // The SDK refuses a handler for a capability the client did not declare, so a
    // form-less host genuinely has nowhere to render one.
    if (declaresElicitation) client.setRequestHandler(ElicitRequestSchema, asked);

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);

    const listed = (await client.listTools()).tools.map((tool) => tool.name);
    // Deliberately called whether or not it was listed: nothing stops a client calling
    // a tool it was never shown, so the gate has to hold on its own.
    const result = await client.callTool({
      name: 'test_cancel',
      arguments: { requestId: 'req-1' },
    });
    await client.close();

    return {
      payload: JSON.parse((result.content as { text: string }[])[0]!.text),
      isError: result.isError === true,
      listed,
      mutate,
      asked,
    };
  }

  it('asks over http when the client can render a form', async () => {
    const { payload, listed, mutate, asked } = await callOverTransport(
      async () => ({ action: 'accept', content: {} }),
      'http',
    );

    expect(listed).toContain('test_cancel');
    expect(asked).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith({ requestId: 'req-1' });
    expect(payload.success).not.toBe(false);
  });

  it('withholds the tool from an http client that cannot be asked', async () => {
    // Listing it would have the agent plan around a tool that refuses every call, which
    // is how a triage run ends in the model explaining a dead end instead of working.
    const { listed } = await callOverTransport(
      async () => ({ action: 'accept', content: {} }),
      'http',
      false,
    );

    expect(listed).not.toContain('test_cancel');
  });

  it('still refuses the withheld tool if it is called anyway', async () => {
    // Withholding is for the model's benefit, not a boundary: a name from a cached
    // list or a guess still reaches `tools/call`.
    const { payload, isError, mutate } = await callOverTransport(
      async () => ({ action: 'accept', content: {} }),
      'http',
      false,
    );

    expect(mutate).not.toHaveBeenCalled();
    expect(isError).toBe(false);
    expect(payload.code).toBe(ConfirmationCode.Unavailable);
    expect(payload.details?.approvalToken).toBeUndefined();
  });

  it('keeps offering the tool over stdio to a form-less client', async () => {
    // The token route needs nothing from the host, so there is nothing to withhold.
    const { listed, payload } = await callOverTransport(
      async () => ({ action: 'accept', content: {} }),
      'stdio',
      false,
    );

    expect(listed).toContain('test_cancel');
    expect(payload.code).toBe(ConfirmationCode.Required);
  });

  it('does not hand out a token over http when the host fails to ask', async () => {
    // The agent is on the far side of the transport here, so a token would be
    // relayed by the very model the gate exists to interpose on.
    const { payload, mutate } = await callOverTransport(async () => {
      throw new Error('host refused to render the form');
    }, 'http');

    expect(mutate).not.toHaveBeenCalled();
    expect(payload.code).toBe(ConfirmationCode.Unavailable);
    expect(payload.details?.approvalToken).toBeUndefined();
  });

  it('runs the mutation on a well-formed confirmation', async () => {
    const { payload, mutate } = await callOverTransport(async () => ({
      action: 'accept',
      content: {},
    }));

    expect(mutate).toHaveBeenCalledWith({ requestId: 'req-1' });
    expect(payload.success).not.toBe(false);
  });

  it('reports a decline as a refusal, with no way to replay it', async () => {
    // A decline is a person's answer, so it must not hand back a token: an agent
    // holding one could land the action anyway after being told no.
    const { payload, isError, mutate, asked } = await callOverTransport(async () => ({
      action: 'decline',
    }));

    expect(asked).toHaveBeenCalledTimes(1);
    expect(mutate).not.toHaveBeenCalled();
    expect(isError).toBe(false);
    expect(payload.code).toBe(ConfirmationCode.Declined);
    expect(payload.details?.approvalToken).toBeUndefined();
  });

  const ODD_CONTENT = [
    { name: 'sends no content at all', content: undefined },
    { name: 'sends an empty object', content: {} },
    { name: 'volunteers fields never asked for', content: { confirmed: 'yes' } },
  ];

  // The form requests no fields, so `content` carries nothing the gate needs and
  // cannot strand the call. Asking for one is what twice turned an approval into
  // `MCP error -32602`: the SDK validates the answer against the schema it sent,
  // and a host that got the shape wrong had its yes thrown away.
  it.each(ODD_CONTENT)('runs the action when the host accepts and $name', async (scenario) => {
    const { isError, mutate } = await callOverTransport(async () => ({
      action: 'accept',
      content: scenario.content as ElicitResult['content'],
    }));

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(isError).toBe(false);
  });

  it('falls back to a token when the host fails the request outright', async () => {
    const { payload, isError, mutate } = await callOverTransport(async () => {
      throw new Error('host refused to render the form');
    });

    expect(mutate).not.toHaveBeenCalled();
    expect(isError).toBe(false);
    expect(payload.code).toBe(ConfirmationCode.Required);
  });

  it('does not act on an approval given after the caller gave up', async () => {
    // The hazard binding closes: a client that gives up at its own tool timeout leaves
    // the form on screen, and without the call's abort signal a yes clicked afterwards
    // still resolves, landing the mutation with no visible result.
    const mutate = vi.fn().mockResolvedValue({ cancelled: true });
    let answer: (result: ElicitResult) => void = () => {};
    let onShown: () => void = () => {};
    const shown = new Promise<void>((resolve) => {
      onShown = resolve;
    });

    const server = buildMcpServer({
      name: 'confirmation-probe',
      version: '0.0.1',
      tools: [{ ...gatedTool(mutate), requireAuth: false }],
      transport: 'http',
    });
    const client = new Client(
      { name: 'cursor', version: '1.0.0' },
      { capabilities: { elicitation: { form: {} } } },
    );
    client.setRequestHandler(ElicitRequestSchema, () => {
      onShown();
      return new Promise<ElicitResult>((resolve) => {
        answer = resolve;
      });
    });

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);

    const abandoned = new AbortController();
    const call = client.callTool(
      { name: 'test_cancel', arguments: { requestId: 'req-1' } },
      undefined,
      { signal: abandoned.signal },
    );
    await shown;
    abandoned.abort();
    await expect(call).rejects.toThrow();

    answer({ action: 'accept', content: {} });
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mutate).not.toHaveBeenCalled();
    await client.close();
  });
});

describe('MCP_SKIP_CONFIRMATION', () => {
  const originalSkip = process.env[MCP_SKIP_CONFIRMATION_ENV];

  afterEach(() => {
    if (originalSkip === undefined) delete process.env[MCP_SKIP_CONFIRMATION_ENV];
    else process.env[MCP_SKIP_CONFIRMATION_ENV] = originalSkip;
  });

  it('returns the gated tool unchanged when skip is enabled', () => {
    process.env[MCP_SKIP_CONFIRMATION_ENV] = '1';
    const mutate = vi.fn();
    const tool = gatedTool(mutate);
    expect(withConfirmation(tool, askOrToken())).toBe(tool);
  });

  it('runs the handler immediately when skip is enabled', async () => {
    process.env[MCP_SKIP_CONFIRMATION_ENV] = '1';
    const mutate = vi.fn(async () => ({ ok: true }));
    const gated = withConfirmation(gatedTool(mutate), askOrToken());
    const result = await gated.handler({ requestId: 'req-1' });
    expect(mutate).toHaveBeenCalledWith({ requestId: 'req-1' });
    expect(result).toEqual({ ok: true });
  });

  it('does not widen the schema with approvalToken when skip is enabled', () => {
    process.env[MCP_SKIP_CONFIRMATION_ENV] = '1';
    const gated = withConfirmation(gatedTool(vi.fn()), askOrToken());
    expect(gated.zodSchema.parse({ requestId: 'r', approvalToken: 'x' })).toEqual({
      requestId: 'r',
    });
  });

  it('still gates when skip is unset', async () => {
    delete process.env[MCP_SKIP_CONFIRMATION_ENV];
    const { mutate, elicitInput } = await callAs({
      capabilities: [McpClientCapability.Elicitation],
      answer: { action: 'cancel', content: {} },
    });
    expect(elicitInput).toHaveBeenCalled();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('still gates when skip is not exactly 1', async () => {
    process.env[MCP_SKIP_CONFIRMATION_ENV] = '0';
    const { mutate, elicitInput } = await callAs({
      capabilities: [McpClientCapability.Elicitation],
      answer: { action: 'accept', content: {} },
    });
    expect(elicitInput).toHaveBeenCalled();
    expect(mutate).toHaveBeenCalled();
  });

  it('expandToolsForClient leaves handlers unwrapped when skip is enabled', async () => {
    process.env[MCP_SKIP_CONFIRMATION_ENV] = '1';
    const mutate = vi.fn(async () => ({ ok: true }));
    const client = { capabilities: new Set<McpClientCapability>(), host: McpHostClient.Claude };
    const [expanded] = expandToolsForClient([gatedTool(mutate)], client, askOrToken());
    await expanded.handler({ requestId: 'req-1' });
    expect(mutate).toHaveBeenCalledWith({ requestId: 'req-1' });
  });
});

describe('withConfirmation tool shape', () => {
  it('leaves an ungated tool exactly as it was', () => {
    const plain = defineTool({
      name: 'test_read',
      description: 'Read something harmless that needs no approval at all.',
      category: 'test',
      readOnly: true,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      zodSchema: z.object({}),
      handler: async () => ({ ok: true }),
    });

    expect(withConfirmation(plain, askOrToken())).toBe(plain);
  });

  it('advertises approvalToken only where the fallback exists', () => {
    const mutate = vi.fn();
    const withFallback = withConfirmation(gatedTool(mutate), askOrToken());
    const withoutFallback = withConfirmation(gatedTool(mutate), REFUSING);

    expect(withFallback.zodSchema.safeParse({ requestId: 'r', approvalToken: 'x' }).success).toBe(
      true,
    );
    // Zod strips unknown keys rather than rejecting them, so the absence shows
    // up in the parsed output that feeds the JSON Schema hosts see.
    expect(withoutFallback.zodSchema.parse({ requestId: 'r', approvalToken: 'x' })).toEqual({
      requestId: 'r',
    });
  });

  it('refuses at construction when a gated tool has nothing to tell the user', () => {
    // A missing hint is a type error, since it is required on the confirmation
    // object. An empty one is all that still needs catching at runtime.
    expect(() =>
      defineTool({
        name: 'test_silent',
        description: 'A gated tool that never says what the user would be agreeing to.',
        category: 'test',
        readOnly: false,
        confirmation: { hint: '  ' },
        annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
        zodSchema: CANCEL_SCHEMA,
        handler: async () => ({}),
      }),
    ).toThrow(/hint is empty/);
  });

  it('refuses to widen over an input field the gate would shadow', () => {
    // Silently replacing it would drop whatever the tool meant by the name, and
    // hand the gate an argument the agent chose.
    const collides = defineTool({
      name: 'test_collides',
      description: 'A gated tool that already spends the name the gate needs for itself.',
      category: 'test',
      readOnly: false,
      confirmation: { hint: 'This permanently cancels the request.' },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
      zodSchema: z.object({
        [APPROVAL_TOKEN_ARG]: z.string().describe('Something else entirely'),
      }),
      handler: async () => ({}),
    });

    expect(() => withConfirmation(collides, askOrToken())).toThrow(/rename the field/);
  });

  it('refuses at construction when a gated tool has a non-object schema', () => {
    expect(() =>
      defineTool({
        name: 'test_bad',
        description: 'A gated tool whose input cannot carry the approval token.',
        category: 'test',
        readOnly: false,
        confirmation: { hint: 'Really?' },
        annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
        zodSchema: z.string().describe('Just a string'),
        handler: async () => ({}),
      }),
    ).toThrow(/not a z.object/);
  });
});
