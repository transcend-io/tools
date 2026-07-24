/**
 * Spike: prove mid-`tools/call` form elicitation through {@link buildMcpServer}.
 *
 * Pattern under test:
 * 1. Client advertises `capabilities.elicitation.form`
 * 2. Tool handler calls `getElicitContext().elicitInput(...)` mid-call
 * 3. Client handles `elicitation/create` and returns accept/decline/cancel
 * 4. Handler resumes and either performs the side effect or aborts
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { ElicitRequestSchema, type ElicitResult } from '@modelcontextprotocol/sdk/types.js';
import { afterEach, describe, expect, it } from 'vitest';

import { getElicitContext } from '../src/elicit-context.js';
import { buildMcpServer } from '../src/server/build-server.js';
import type { ToolDefinition } from '../src/tools/types.js';
import { z } from '../src/validation/index.js';

type ElicitHandler = (params: {
  /** Human-readable elicitation prompt from the server */
  message: string;
}) => Promise<ElicitResult>;

/** Side-effect counter — only incremented after a successful confirm. */
let deleted: string[] = [];

function createConfirmDeleteTool(): ToolDefinition {
  return {
    name: 'confirm_delete',
    description: 'Spike tool: elicit confirmation, then record a delete',
    category: 'spike',
    readOnly: false,
    requireAuth: false,
    confirmationHint: 'Deletes the named resource permanently',
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    zodSchema: z.object({
      name: z.string().describe('Resource name to delete after confirmation'),
    }),
    handler: async (args) => {
      const elicit = getElicitContext();
      if (!elicit) {
        throw new Error('Elicit context missing — buildMcpServer did not bind it');
      }
      if (!elicit.supportsFormElicitation) {
        throw new Error('Client does not support form elicitation.');
      }

      const result = await elicit.elicitInput({
        mode: 'form',
        message: `Delete "${args.name}"? This cannot be undone.`,
        requestedSchema: {
          type: 'object',
          properties: {
            confirm: {
              type: 'boolean',
              title: 'Yes, delete it',
              description: 'Must be true to proceed',
            },
          },
          required: ['confirm'],
        },
      });

      switch (result.action) {
        case 'accept': {
          if (result.content?.confirm !== true) {
            return { ok: false, cancelled: true, reason: 'confirm_unchecked' };
          }
          deleted.push(args.name);
          return { ok: true, deleted: args.name };
        }
        case 'decline':
          return { ok: false, cancelled: true, reason: 'declined' };
        case 'cancel':
          return { ok: false, cancelled: true, reason: 'cancelled' };
        default:
          return { ok: false, cancelled: true, reason: 'unknown' };
      }
    },
  };
}

async function connectPair(options: {
  /** Client elicitation capability blob, or omit to advertise none */
  elicitation?: { form?: Record<string, never> };
  /** How the client answers elicitation/create */
  onElicit?: ElicitHandler;
}): Promise<{
  /** Connected MCP client */
  client: Client;
  /** Close both sides */
  close: () => Promise<void>;
}> {
  const server = buildMcpServer({
    name: 'elicit-spike-server',
    version: '0.0.0',
    tools: [createConfirmDeleteTool()],
  });

  const client = new Client(
    { name: 'elicit-spike-client', version: '0.0.0' },
    {
      capabilities: options.elicitation ? { elicitation: options.elicitation } : {},
    },
  );

  if (options.onElicit) {
    client.setRequestHandler(ElicitRequestSchema, async (request) => {
      expect(request.params.mode === undefined || request.params.mode === 'form').toBe(true);
      return options.onElicit!({ message: request.params.message });
    });
  }

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  return {
    client,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}

function parseToolJson(result: {
  /** MCP content blocks */
  content: Array<{ type: string; text?: string }>;
  /** Whether the call failed */
  isError?: boolean;
}): unknown {
  const text = result.content.find((c) => c.type === 'text')?.text;
  expect(text).toBeTruthy();
  return JSON.parse(text!);
}

describe('spike: mid-CallTool form elicitation via buildMcpServer', () => {
  afterEach(() => {
    deleted = [];
  });

  it('accept + confirm=true runs the side effect after mid-call elicit', async () => {
    const { client, close } = await connectPair({
      elicitation: { form: {} },
      onElicit: async ({ message }) => {
        expect(message).toContain('important.txt');
        return { action: 'accept', content: { confirm: true } };
      },
    });

    try {
      const result = await client.callTool({
        name: 'confirm_delete',
        arguments: { name: 'important.txt' },
      });
      expect(result.isError).toBeFalsy();
      expect(parseToolJson(result as never)).toEqual({ ok: true, deleted: 'important.txt' });
      expect(deleted).toEqual(['important.txt']);
    } finally {
      await close();
    }
  });

  it('accept + confirm=false does not run the side effect', async () => {
    const { client, close } = await connectPair({
      elicitation: { form: {} },
      onElicit: async () => ({ action: 'accept', content: { confirm: false } }),
    });

    try {
      const result = await client.callTool({
        name: 'confirm_delete',
        arguments: { name: 'skip-me.txt' },
      });
      expect(result.isError).toBeFalsy();
      expect(parseToolJson(result as never)).toEqual({
        ok: false,
        cancelled: true,
        reason: 'confirm_unchecked',
      });
      expect(deleted).toEqual([]);
    } finally {
      await close();
    }
  });

  it('decline cancels without side effect', async () => {
    const { client, close } = await connectPair({
      elicitation: { form: {} },
      onElicit: async () => ({ action: 'decline' }),
    });

    try {
      const result = await client.callTool({
        name: 'confirm_delete',
        arguments: { name: 'nope.txt' },
      });
      expect(result.isError).toBeFalsy();
      expect(parseToolJson(result as never)).toEqual({
        ok: false,
        cancelled: true,
        reason: 'declined',
      });
      expect(deleted).toEqual([]);
    } finally {
      await close();
    }
  });

  it('cancel cancels without side effect', async () => {
    const { client, close } = await connectPair({
      elicitation: { form: {} },
      onElicit: async () => ({ action: 'cancel' }),
    });

    try {
      const result = await client.callTool({
        name: 'confirm_delete',
        arguments: { name: 'dismiss.txt' },
      });
      expect(result.isError).toBeFalsy();
      expect(parseToolJson(result as never)).toEqual({
        ok: false,
        cancelled: true,
        reason: 'cancelled',
      });
      expect(deleted).toEqual([]);
    } finally {
      await close();
    }
  });

  it('fails closed when client omits elicitation.form', async () => {
    const { client, close } = await connectPair({
      // no elicitation capability
    });

    try {
      const result = await client.callTool({
        name: 'confirm_delete',
        arguments: { name: 'blocked.txt' },
      });
      expect(result.isError).toBe(true);
      const body = parseToolJson(result as never) as {
        /** Error message from createErrorResult */
        error?: { message?: string };
        /** Some error shapes use top-level message */
        message?: string;
      };
      const message = body.error?.message ?? body.message ?? JSON.stringify(body);
      expect(message).toMatch(/form elicitation/i);
      expect(deleted).toEqual([]);
    } finally {
      await close();
    }
  });

  it('empty elicitation {} is normalized to { form: {} } on initialize (works)', async () => {
    // SDK ClientCapabilitiesSchema transforms bare `elicitation: {}` → `{ form: {} }`
    // for backwards compatibility, so Server.elicitInput succeeds.
    const { client, close } = await connectPair({
      elicitation: {} as { form?: Record<string, never> },
      onElicit: async () => ({ action: 'accept', content: { confirm: true } }),
    });

    try {
      const result = await client.callTool({
        name: 'confirm_delete',
        arguments: { name: 'empty-cap.txt' },
      });
      expect(result.isError).toBeFalsy();
      expect(parseToolJson(result as never)).toEqual({ ok: true, deleted: 'empty-cap.txt' });
      expect(deleted).toEqual(['empty-cap.txt']);
    } finally {
      await close();
    }
  });
});
