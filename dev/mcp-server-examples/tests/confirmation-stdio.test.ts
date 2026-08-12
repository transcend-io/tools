/**
 * The confirmation gate against a real host over a real transport.
 *
 * The unit tests in `@transcend-io/mcp-server-base` cover the wrapper's
 * decisions. What only a built artifact on stdio can show is the wiring around
 * them: that `--transport=stdio` is what turns the approval-token fallback on,
 * that the widened `approvalToken` argument survives schema serialization, and
 * that a token minted by one call is redeemable by the next.
 */

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { ElicitRequestSchema, type ElicitResult } from '@modelcontextprotocol/sdk/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const cliPath = join(dirname(fileURLToPath(import.meta.url)), '../dist/cli.mjs');

// The built CLI is the subject, so skip rather than fail on a clean clone, where
// `pnpm test` runs before `build`.
const describeIfBuilt = existsSync(cliPath) ? describe : describe.skip;

const TOOL = 'example_consequential';
const ARGS = { recordId: 'rec-42', owner: 'ada@example.com' };

/** Payload shape both the approved and refused paths produce. */
interface GateResult {
  /** Whether the mutation ran */
  success: boolean;
  /** Present only on success */
  data?: {
    /** Confirmation that the pretend deletion was reached */
    message: string;
  };
  /** Present only on a refusal */
  error?: string;
  /** Machine-readable confirmation outcome */
  code?: string;
  /** Recap, plus the approval token when one was minted */
  details?: {
    /** Recap of the pending action, for the agent to relay */
    summary?: Record<string, string>;
    /** Token to replay on a form-less host */
    approvalToken?: string;
  };
}

async function call(client: Client, args: Record<string, unknown>): Promise<GateResult> {
  const result = await client.callTool({ name: TOOL, arguments: args });
  return JSON.parse((result.content as { text: string }[])[0]!.text);
}

function connect(client: Client): Promise<void> {
  return client.connect(
    new StdioClientTransport({ command: process.execPath, args: [cliPath, '--transport=stdio'] }),
  );
}

describeIfBuilt('confirmation gate over stdio (host that shows forms)', () => {
  let client: Client;
  let prompts: { message: string }[];
  let answer: ElicitResult;

  beforeAll(async () => {
    prompts = [];
    answer = { action: 'accept', content: { decision: 'confirm' } };

    client = new Client(
      { name: 'cursor', version: '1.0.0' },
      { capabilities: { elicitation: { form: {} } } },
    );
    client.setRequestHandler(ElicitRequestSchema, async (request) => {
      prompts.push({ message: request.params.message });
      return answer;
    });

    await connect(client);
  }, 30_000);

  afterAll(async () => {
    await client?.close();
  });

  it('asks before running, and names what will be affected', async () => {
    prompts = [];
    answer = { action: 'accept', content: { decision: 'confirm' } };
    const result = await call(client, ARGS);

    expect(prompts).toHaveLength(1);
    // Identifiers appear in full: the recap is what lets the user check the
    // action against the agent's account of it, which an obscured value defeats.
    expect(prompts[0]!.message).toContain('recordId: rec-42');
    expect(prompts[0]!.message).toContain('owner: ada@example.com');

    expect(result.success).toBe(true);
    expect(result.data!.message).toContain('rec-42');
  });

  it('does not run when the user declines', async () => {
    prompts = [];
    answer = { action: 'decline' };
    const result = await call(client, ARGS);

    expect(prompts).toHaveLength(1);
    expect(result.success).toBe(false);
    expect(result.code).toBe('CONFIRMATION_DECLINED');
    expect(result.data).toBeUndefined();
  });

  it('does not run when the user dismisses the prompt', async () => {
    prompts = [];
    answer = { action: 'cancel' };
    const result = await call(client, ARGS);

    expect(result.success).toBe(false);
    expect(result.code).toBe('CONFIRMATION_CANCELLED');
  });
});

describeIfBuilt('confirmation gate over stdio (host that cannot show forms)', () => {
  let client: Client;

  beforeAll(async () => {
    client = new Client({ name: 'codex', version: '1.0.0' }, { capabilities: {} });
    await connect(client);
  }, 30_000);

  afterAll(async () => {
    await client?.close();
  });

  it('offers approvalToken in the published input schema', async () => {
    // The gate widens the schema, so a host that never sees the field cannot
    // complete the handshake it is being asked to perform.
    const { tools } = await client.listTools();
    const gated = tools.find((tool) => tool.name === TOOL)!;

    expect(Object.keys(gated.inputSchema.properties ?? {})).toContain('approvalToken');
    expect(gated.inputSchema.required).not.toContain('approvalToken');
  });

  it('mints a token instead of running, then runs on the replay', async () => {
    const first = await call(client, ARGS);
    expect(first.success).toBe(false);
    expect(first.code).toBe('CONFIRMATION_REQUIRED');
    expect(first.details!.summary).toBeUndefined();

    const token = first.details!.approvalToken!;
    expect(token).toEqual(expect.any(String));

    const second = await call(client, { ...ARGS, approvalToken: token });
    expect(second.success).toBe(true);
    expect(second.data!.message).toContain('rec-42');

    // Single use: the same token must not release a second mutation.
    const replayed = await call(client, { ...ARGS, approvalToken: token });
    expect(replayed.success).toBe(false);
    expect(replayed.code).toBe('CONFIRMATION_TOKEN_INVALID');
  });

  it('refuses a token replayed against different arguments', async () => {
    const first = await call(client, ARGS);
    const token = first.details!.approvalToken!;

    const swapped = await call(client, { ...ARGS, recordId: 'rec-99', approvalToken: token });
    expect(swapped.success).toBe(false);
    expect(swapped.code).toBe('CONFIRMATION_TOKEN_INVALID');
  });
});
