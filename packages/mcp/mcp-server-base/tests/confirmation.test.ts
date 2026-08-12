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

import { McpClientCapability, McpHostClient } from '../src/capabilities/types.js';
import { mcpSessionContext, type McpSession } from '../src/mcp-session-context.js';
import { buildMcpServer } from '../src/server/build-server.js';
import { ApprovalTokenStore } from '../src/tools/approval-tokens.js';
import {
  APPROVAL_TOKEN_ARG,
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
  return { policy: ConfirmationPolicy.AskOrToken, tokens };
}

/** An HTTP-shaped gate: no approval is obtainable on this connection. */
const REFUSING: ConfirmationGate = { policy: ConfirmationPolicy.Refuse };

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
    : vi
        .fn()
        .mockResolvedValue(
          options.answer ?? { action: 'accept', content: { decision: 'confirm' } },
        );

  const session: McpSession = {
    client: {
      capabilities: new Set(options.capabilities ?? []),
      host: McpHostClient.Claude,
    },
    server: { elicitInput } as unknown as Server,
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

    expect(elicitInput.mock.calls[0]![1]).toEqual({ timeout: CONFIRMATION_TIMEOUT_MS });
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

  it('does not mutate when the host accepts without choosing to proceed', async () => {
    // Submitting the dialog is not the same as saying yes, and nothing forces a
    // host to answer with the shape it was asked for.
    const answers: Record<string, string | number | boolean | string[]>[] = [
      {},
      { decision: 'cancel' },
      { decision: true },
    ];
    for (const content of answers) {
      const { result, mutate } = await callAs({
        capabilities: ELICITATION,
        answer: { action: 'accept', content },
      });

      expect(mutate, JSON.stringify(content)).not.toHaveBeenCalled();
      expect((result as Refusal).code).toBe(ConfirmationCode.Declined);
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
      answer: { action: 'accept', content: { decision: 'confirm' } },
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

  it('refuses a gated tool that calls itself non-destructive', () => {
    // destructiveHint is what an Apps host reads to decide how hard to prompt,
    // and Apps is exactly the path the gate does not cover. Letting the two
    // disagree would under-prompt precisely where we stepped back.
    expect(gatedWith({ readOnlyHint: false, destructiveHint: false })).toThrow(
      /annotates destructiveHint: false/,
    );
  });

  it('accepts the one coherent combination', () => {
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
          elicitInput: vi
            .fn()
            .mockResolvedValue({ action: 'accept', content: { decision: 'confirm' } }),
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
  ): Promise<{
    /** Parsed tool result payload */
    payload: Refusal & { success: boolean };
    /** Whether the call came back as a protocol-level error */
    isError: boolean;
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
      { capabilities: { elicitation: { form: {} } } },
    );
    client.setRequestHandler(ElicitRequestSchema, asked);

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);

    const result = await client.callTool({
      name: 'test_cancel',
      arguments: { requestId: 'req-1' },
    });
    await client.close();

    return {
      payload: JSON.parse((result.content as { text: string }[])[0]!.text),
      isError: result.isError === true,
      mutate,
      asked,
    };
  }

  it('refuses over http even when the client says it can ask a person', async () => {
    // The requirement the HTTP policy exists for: the caller there is another
    // service, and its own claim about rendering forms must not be what decides
    // whether a destructive action runs.
    const { payload, isError, mutate, asked } = await callOverTransport(
      async () => ({ action: 'accept', content: { decision: 'confirm' } }),
      'http',
    );

    expect(asked).not.toHaveBeenCalled();
    expect(mutate).not.toHaveBeenCalled();
    expect(isError).toBe(false);
    expect(payload.code).toBe(ConfirmationCode.Unavailable);
  });

  it('runs the mutation on a well-formed confirmation', async () => {
    const { payload, mutate } = await callOverTransport(async () => ({
      action: 'accept',
      content: { decision: 'confirm' },
    }));

    expect(mutate).toHaveBeenCalledWith({ requestId: 'req-1' });
    expect(payload.success).not.toBe(false);
  });

  const REJECTED = [
    { name: 'omits the decision', content: {} },
    { name: 'answers with the wrong type', content: { decision: true } },
  ];

  it.each(REJECTED)('falls back to a token when the host $name', async (scenario) => {
    const { payload, isError, mutate } = await callOverTransport(async () => ({
      action: 'accept',
      content: scenario.content as ElicitResult['content'],
    }));

    // Previously this surfaced as `MCP error -32602`, which tells the agent
    // nothing it can act on and strands the call with no way to proceed.
    expect(mutate).not.toHaveBeenCalled();
    expect(isError).toBe(false);
    expect(payload.code).toBe(ConfirmationCode.Required);
    expect(payload.details?.approvalToken).toEqual(expect.any(String));
  });

  it('falls back to a token when the host fails the request outright', async () => {
    const { payload, isError, mutate } = await callOverTransport(async () => {
      throw new Error('host refused to render the form');
    });

    expect(mutate).not.toHaveBeenCalled();
    expect(isError).toBe(false);
    expect(payload.code).toBe(ConfirmationCode.Required);
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
