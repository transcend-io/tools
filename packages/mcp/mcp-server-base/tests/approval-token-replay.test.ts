/**
 * That an approval token can actually be spent, through a real server.
 *
 * The rest of the gate's replay coverage calls handlers directly, which skips the
 * step where the token can go missing: `build-server` validates arguments and
 * hands the handler `parseResult.data`, and Zod drops keys the schema does not
 * declare instead of rejecting them. So a gate that mints a token while the
 * schema stays un-widened would advertise a way forward, silently discard it, and
 * ask again on every retry — a caller doing everything right could never proceed.
 * Only a call that goes through argument validation can catch that.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { describe, expect, it, vi } from 'vitest';

import { buildMcpServer } from '../src/server/build-server.js';
import { APPROVAL_TOKEN_ARG, ConfirmationCode } from '../src/tools/confirmation.js';
import { defineTool } from '../src/tools/types.js';
import { z } from '../src/validation/index.js';

const CANCEL_SCHEMA = z.object({
  requestId: z.string().describe('Thing to cancel'),
});

/** Server plus a form-less client, so the gate has only the token route. */
async function connectFormlessHost(): Promise<{
  /** Calls the gated tool and returns its parsed payload */
  call: (args: Record<string, unknown>) => Promise<{
    /** Refusal code, when the call did not run */
    code?: string;
    /** Details carrying the token to replay */
    details?: {
      /** Token the caller replays to proceed */
      approvalToken?: string;
    };
  }>;
  /** Stand-in for the business handler */
  mutate: ReturnType<typeof vi.fn>;
  /** Input schema the client was shown for the gated tool */
  advertisedSchema: () => Promise<{
    /** Declared input properties, keyed by field name */
    properties?: Record<string, unknown>;
  }>;
  /** Tears the connection down */
  close: () => Promise<void>;
}> {
  const mutate = vi.fn().mockResolvedValue({ cancelled: true });
  const server = buildMcpServer({
    name: 'replay-probe',
    version: '0.0.1',
    tools: [
      {
        ...defineTool({
          name: 'test_cancel',
          description: 'Cancel something, but only once a human has agreed to it.',
          category: 'test',
          readOnly: false,
          confirmation: { hint: 'This permanently cancels the request.' },
          annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
          zodSchema: CANCEL_SCHEMA,
          handler: mutate,
        }),
        requireAuth: false,
      },
    ],
    transport: 'stdio',
  });

  // No elicitation capability, so the gate cannot ask and must mint a token.
  const client = new Client({ name: 'tokens-only', version: '1.0.0' }, { capabilities: {} });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);

  return {
    call: async (args) => {
      const result = await client.callTool({ name: 'test_cancel', arguments: args });
      return JSON.parse((result.content as { text: string }[])[0]!.text);
    },
    mutate,
    advertisedSchema: async () => {
      const { tools } = await client.listTools();
      return tools.find((tool) => tool.name === 'test_cancel')!.inputSchema;
    },
    close: () => client.close(),
  };
}

describe('spending an approval token over a real connection', () => {
  it('advertises the token in the schema the host is shown', async () => {
    const host = await connectFormlessHost();

    // Not decoration: an agent that is never shown the field has no reason to send
    // it, and a field the schema omits is stripped before the gate looks for it.
    expect(Object.keys((await host.advertisedSchema()).properties ?? {})).toContain(
      APPROVAL_TOKEN_ARG,
    );

    await host.close();
  });

  it('runs the mutation on the replayed call, not the first one', async () => {
    const host = await connectFormlessHost();

    const first = await host.call({ requestId: 'req-1' });

    expect(first.code).toBe(ConfirmationCode.Required);
    expect(host.mutate).not.toHaveBeenCalled();

    const token = first.details?.approvalToken;
    expect(token).toEqual(expect.any(String));

    const second = await host.call({ requestId: 'req-1', [APPROVAL_TOKEN_ARG]: token });

    // The token reached the gate rather than being dropped in validation, and the
    // gate spent it. `mutate` also proves the tool ran with the token removed.
    expect(host.mutate).toHaveBeenCalledTimes(1);
    expect(host.mutate).toHaveBeenCalledWith({ requestId: 'req-1' });
    expect(second.code).toBeUndefined();

    await host.close();
  });

  it('refuses to spend the same token twice', async () => {
    const host = await connectFormlessHost();

    const first = await host.call({ requestId: 'req-1' });
    const args = { requestId: 'req-1', [APPROVAL_TOKEN_ARG]: first.details!.approvalToken! };

    await host.call(args);
    const replayed = await host.call(args);

    // Spent rather than missing, so the caller is told the token is no good instead
    // of being handed a fresh one it could spend without asking anybody again.
    expect(host.mutate).toHaveBeenCalledTimes(1);
    expect(replayed.code).toBe(ConfirmationCode.TokenInvalid);

    await host.close();
  });
});
