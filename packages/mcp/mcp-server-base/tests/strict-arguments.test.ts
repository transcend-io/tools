/**
 * What happens to arguments a tool never declared.
 *
 * Zod strips unknown keys by default, so before this an agent that guessed
 * `query` where the tool wanted `keyword` had its argument dropped and the tool
 * ran its no-argument behaviour while reporting success. These cases pin the
 * refusal, the wording that lets an agent correct itself, and the one key that
 * still has to get through: the confirmation gate's approval token.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { ElicitRequestSchema, type ElicitResult } from '@modelcontextprotocol/sdk/types.js';
import { describe, expect, it, vi } from 'vitest';

import { buildMcpServer } from '../src/server/build-server.js';
import { APPROVAL_TOKEN_ARG, ConfirmationCode } from '../src/tools/confirmation/index.js';
import { defineTool, type ToolDefinition } from '../src/tools/types.js';
import { z } from '../src/validation/index.js';

/** Shape `createToolResult` produces, success or failure. */
interface ToolPayload {
  /** Whether the tool ran */
  success: boolean;
  /** Human-readable explanation when it did not */
  error?: string;
  /** Machine-readable failure code */
  code?: string;
  /** Extra context, including a minted approval token */
  details?: {
    /** Token to replay once the user agrees */
    approvalToken?: string;
  };
}

/** A search-shaped tool, i.e. the case that started this. */
function searchTool(run = vi.fn(async () => ({ hits: [] }))): ToolDefinition {
  return {
    ...defineTool({
      name: 'test_docs_list',
      description: 'List or full-text search documentation articles.',
      category: 'test',
      readOnly: true,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      zodSchema: z.object({
        section: z.string().optional().describe('Restrict to one section.'),
        keyword: z.string().optional().describe('Full-text search terms.'),
      }),
      handler: run,
    }),
    requireAuth: false,
  };
}

/** A tool that takes nothing at all, to check the wording in that case. */
function noArgTool(): ToolDefinition {
  return {
    ...defineTool({
      name: 'test_ping',
      description: 'Answer with a fixed payload, taking no arguments whatsoever.',
      category: 'test',
      readOnly: true,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      zodSchema: z.object({}),
      handler: async () => ({ ok: true }),
    }),
    requireAuth: false,
  };
}

/** A destructive, confirmation-gated tool shaped like `dsr_cancel`. */
function cancelTool(mutate: (args: unknown) => Promise<unknown>): ToolDefinition {
  return {
    ...defineTool({
      name: 'test_dsr_cancel',
      description: 'Cancel a data subject request, once a human has agreed to it.',
      category: 'test',
      readOnly: false,
      confirmation: { hint: 'Permanently cancels this data subject request.' },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
      zodSchema: z.object({
        requestId: z.string().describe('ID of the DSR to cancel'),
        reason: z.string().optional().describe('Reason for cancellation (optional)'),
      }),
      handler: mutate,
    }),
    requireAuth: false,
  };
}

/** Connects a client to a server carrying `tools` and returns a caller. */
async function connect(
  tools: ToolDefinition[],
  options: {
    /** Which gate the transport implies */
    transport?: 'stdio' | 'http';
    /** Elicitation answer, if the host renders forms at all */
    respond?: () => Promise<ElicitResult>;
  } = {},
) {
  const server = buildMcpServer({
    name: 'strict-arguments-probe',
    version: '0.0.1',
    tools,
    transport: options.transport ?? 'http',
  });

  const client = new Client(
    { name: 'cursor', version: '1.0.0' },
    { capabilities: options.respond ? { elicitation: { form: {} } } : {} },
  );
  const asked = vi.fn(options.respond ?? (async () => ({ action: 'accept' }) as ElicitResult));
  if (options.respond) client.setRequestHandler(ElicitRequestSchema, asked);

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);

  return {
    asked,
    close: () => client.close(),
    async call(name: string, args: Record<string, unknown>) {
      const result = await client.callTool({ name, arguments: args });
      return {
        payload: JSON.parse((result.content as { text: string }[])[0]!.text) as ToolPayload,
        isError: result.isError === true,
      };
    },
    async inputSchema(name: string) {
      const listed = await client.listTools();
      return listed.tools.find((tool) => tool.name === name)?.inputSchema;
    },
  };
}

describe('unknown arguments are refused rather than dropped', () => {
  it('refuses a misspelled argument instead of running with none', async () => {
    const run = vi.fn(async () => ({ hits: [] }));
    const session = await connect([searchTool(run)]);

    const { payload, isError } = await session.call('test_docs_list', {
      query: 'cookies data flows needs review',
    });
    await session.close();

    // The whole point: the old behaviour was a successful full-catalog listing.
    expect(run).not.toHaveBeenCalled();
    expect(isError).toBe(true);
    expect(payload.success).toBe(false);
    expect(payload.code).toBe('VALIDATION_ERROR');
  });

  it('names the rejected argument and the ones that would have worked', async () => {
    const session = await connect([searchTool()]);

    const { payload } = await session.call('test_docs_list', { query: 'airgap' });
    await session.close();

    // An agent that pattern-matched `query` can fix itself in one retry only if
    // the accepted names come back with the refusal.
    expect(payload.error).toContain("unrecognized argument 'query'");
    expect(payload.error).toContain('Valid arguments: section, keyword');
  });

  it('says so plainly when the tool takes no arguments at all', async () => {
    const session = await connect([noArgTool()]);

    const { payload } = await session.call('test_ping', { verbose: true });
    await session.close();

    expect(payload.error).toContain("unrecognized argument 'verbose'");
    expect(payload.error).toContain('test_ping takes no arguments');
  });

  it('lists every unknown argument, not just the first', async () => {
    const session = await connect([searchTool()]);

    const { payload } = await session.call('test_docs_list', { query: 'a', limit: 5 });
    await session.close();

    expect(payload.error).toContain("'query'");
    expect(payload.error).toContain("'limit'");
  });

  it('still runs a correctly named call', async () => {
    const run = vi.fn(async () => ({ hits: [] }));
    const session = await connect([searchTool(run)]);

    const { isError } = await session.call('test_docs_list', { keyword: 'airgap' });
    await session.close();

    expect(isError).toBe(false);
    expect(run).toHaveBeenCalledWith({ keyword: 'airgap' });
  });

  it('leaves omitted optional arguments alone', async () => {
    const run = vi.fn(async () => ({ hits: [] }));
    const session = await connect([searchTool(run)]);

    await session.call('test_docs_list', {});
    await session.close();

    expect(run).toHaveBeenCalledWith({});
  });
});

describe('the confirmation gate still works under strict arguments', () => {
  it('elicits, then mutates, when the host can show a form', async () => {
    const mutate = vi.fn(async () => ({ cancelled: true }));
    const session = await connect([cancelTool(mutate)], {
      transport: 'http',
      respond: async () => ({ action: 'accept', content: {} }),
    });

    const { payload } = await session.call('test_dsr_cancel', { requestId: 'req-1' });
    await session.close();

    expect(session.asked).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith({ requestId: 'req-1' });
    expect(payload.success).not.toBe(false);
  });

  it('does not mutate when the user declines', async () => {
    const mutate = vi.fn(async () => ({ cancelled: true }));
    const session = await connect([cancelTool(mutate)], {
      transport: 'http',
      respond: async () => ({ action: 'decline' }),
    });

    const { payload } = await session.call('test_dsr_cancel', { requestId: 'req-1' });
    await session.close();

    expect(mutate).not.toHaveBeenCalled();
    expect(payload.code).toBe(ConfirmationCode.Declined);
  });

  it('round-trips a minted approval token over stdio', async () => {
    // The token is an argument the agent sends back, so strict validation is
    // directly in its path: reject it and the whole fallback route dies.
    const mutate = vi.fn(async () => ({ cancelled: true }));
    const session = await connect([cancelTool(mutate)], { transport: 'stdio' });

    const first = await session.call('test_dsr_cancel', { requestId: 'req-1' });
    expect(mutate).not.toHaveBeenCalled();
    expect(first.payload.code).toBe(ConfirmationCode.Required);

    const token = first.payload.details?.approvalToken;
    expect(token).toBeTruthy();

    const second = await session.call('test_dsr_cancel', {
      requestId: 'req-1',
      [APPROVAL_TOKEN_ARG]: token!,
    });
    await session.close();

    expect(mutate).toHaveBeenCalledWith({ requestId: 'req-1' });
    expect(second.payload.success).not.toBe(false);
  });

  it('explains a replayed token on a connection that never issues one', async () => {
    // Here the gate does not advertise the token, so a strict schema would
    // ordinarily reject it as unknown. It is let through so the gate can give
    // its own account of why the token is no good.
    const mutate = vi.fn(async () => ({ cancelled: true }));
    const session = await connect([cancelTool(mutate)], {
      transport: 'http',
      respond: async () => ({ action: 'accept', content: {} }),
    });

    const { payload } = await session.call('test_dsr_cancel', {
      requestId: 'req-1',
      [APPROVAL_TOKEN_ARG]: 'not-a-real-token',
    });
    await session.close();

    expect(mutate).not.toHaveBeenCalled();
    expect(payload.code).toBe(ConfirmationCode.TokenInvalid);
    expect(payload.error).toContain('only issued over the stdio transport');
  });

  it('keeps the approval token out of the advertised schema where it cannot be used', async () => {
    // Tolerating the key at validation must not turn into advertising it: the
    // input schema is still derived from the tool's own zodSchema.
    const session = await connect([cancelTool(vi.fn())], {
      transport: 'http',
      respond: async () => ({ action: 'accept', content: {} }),
    });

    const schema = (await session.inputSchema('test_dsr_cancel')) as {
      properties?: Record<string, unknown>;
    };
    await session.close();

    expect(Object.keys(schema.properties ?? {})).toEqual(['requestId', 'reason']);
  });

  it('still refuses an ordinary unknown argument on a gated tool', async () => {
    const mutate = vi.fn(async () => ({ cancelled: true }));
    const session = await connect([cancelTool(mutate)], {
      transport: 'stdio',
      respond: async () => ({ action: 'accept', content: {} }),
    });

    const { payload } = await session.call('test_dsr_cancel', {
      requestId: 'req-1',
      cascade: true,
    });
    await session.close();

    expect(mutate).not.toHaveBeenCalled();
    expect(payload.code).toBe('VALIDATION_ERROR');
    expect(payload.error).toContain("unrecognized argument 'cascade'");
  });
});
