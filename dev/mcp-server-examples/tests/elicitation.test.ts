/**
 * What `example_elicitation` does with each way a host can answer a form.
 *
 * Scoped to the handler's decisions: whether it asks at all, and what a declined,
 * dismissed, or malformed answer turns into. Sending the request and gating it on
 * the declared capability belong to `requestElicitation`, tested in
 * `@transcend-io/mcp-server-base`. A scripted host stands in, so no build or
 * transport is needed; `mcp-apps-stdio.test.ts` covers the real thing.
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { ElicitResult } from '@modelcontextprotocol/sdk/types.js';
import {
  McpClientCapability,
  McpHostClient,
  mcpSessionContext,
  resolveToolVariant,
  type McpSession,
} from '@transcend-io/mcp-server-base';
import { describe, expect, it, vi } from 'vitest';

import { createExampleElicitationTool } from '../src/tools/elicitation.js';

/** The response shape `echoPayload` produces. */
interface EchoResult {
  success: boolean;
  data: {
    outcome: string;
    echo?: string;
    fields: Record<string, unknown>;
    invalidFields?: string[];
  };
}

/** Runs the tool as the server would: resolve a variant, call it in that session. */
async function callAs(
  capabilities: McpClientCapability[],
  args: Record<string, unknown>,
  answer: ElicitResult = { action: 'accept', content: {} },
): Promise<{ result: EchoResult; elicitInput: ReturnType<typeof vi.fn> }> {
  const elicitInput = vi.fn().mockResolvedValue(answer);
  const session: McpSession = {
    client: { capabilities: new Set(capabilities), host: McpHostClient.Claude },
    server: { elicitInput } as unknown as Server,
  };

  const resolved = resolveToolVariant(createExampleElicitationTool(), session.client);
  const result = await mcpSessionContext.run(session, async () => resolved.handler(args));

  return { result: result as EchoResult, elicitInput };
}

const ELICITATION = [McpClientCapability.Elicitation];

describe('example_elicitation', () => {
  it('asks a host that can show a form, and echoes what came back', async () => {
    const { result, elicitInput } = await callAs(
      ELICITATION,
      {},
      {
        action: 'accept',
        content: { label: 'ping', priority: 'high', repeat: 3, loud: true, tags: ['alpha'] },
      },
    );

    expect(elicitInput).toHaveBeenCalledTimes(1);
    expect(result.data.outcome).toBe('answered');
    expect(result.data.echo).toBe('PING PING PING');
    expect(result.data.fields).toMatchObject({ priority: 'high', tags: ['alpha'] });
  });

  it('does not interrupt when the agent already supplied every required field', async () => {
    const { result, elicitInput } = await callAs(ELICITATION, { label: 'ping', priority: 'low' });

    expect(elicitInput).not.toHaveBeenCalled();
    expect(result.data.outcome).toBe('not-asked');
    expect(result.data.echo).toBe('ping');
  });

  it('treats a decline as an answer and a cancel as the absence of one', async () => {
    // Both stop the tool, but a decline is a no and a cancel leaves it open.
    const declined = await callAs(ELICITATION, {}, { action: 'decline' });
    expect(declined.result.data.outcome).toBe('declined');

    const cancelled = await callAs(ELICITATION, {}, { action: 'cancel' });
    expect(cancelled.result.data.outcome).toBe('cancelled');

    // Neither may fall back to the arguments, or refusing would silently proceed.
    for (const { result } of [declined, cancelled]) {
      expect(result.success).toBe(true);
      expect(result.data.echo).toBeUndefined();
      expect(result.data.fields).toEqual({});
    }
  });

  it('reports a host that answers with the wrong types instead of echoing them', async () => {
    // Nothing enforces that an answer matches `requestedSchema`, so this is a real
    // failure rather than a defensive one.
    const { result } = await callAs(
      ELICITATION,
      { label: 'ping' },
      {
        action: 'accept',
        content: { label: 'ping', priority: 'urgent', repeat: 'three' },
      },
    );

    expect(result.data.outcome).toBe('malformed');
    expect(result.data.invalidFields).toEqual(expect.arrayContaining(['priority', 'repeat']));
  });

  it('reports a host that accepts without the fields the form required', async () => {
    // Echoing an empty acceptance would be indistinguishable from a filled-in form.
    const { result } = await callAs(ELICITATION, {}, { action: 'accept', content: {} });

    expect(result.data.outcome).toBe('malformed');
    expect(result.data.invalidFields).toEqual(expect.arrayContaining(['label', 'priority']));
  });

  it('echoes the agent arguments on a host that cannot be asked at all', async () => {
    const { result, elicitInput } = await callAs([], { label: 'ping', repeat: 2 });

    expect(elicitInput).not.toHaveBeenCalled();
    expect(result.data.outcome).toBe('unavailable');
    expect(result.data.echo).toBe('ping ping');
  });

  it('keeps the form reachable on a host that also supports MCP Apps', async () => {
    // The point of this tool having no app variant. Precedence is app, then
    // elicitation, so a tool with both would resolve to its view here and the form
    // would never be exercised against a real host.
    const { result, elicitInput } = await callAs(
      [McpClientCapability.Elicitation, McpClientCapability.McpApp],
      {},
      { action: 'accept', content: { label: 'ping', priority: 'normal' } },
    );

    expect(elicitInput).toHaveBeenCalledTimes(1);
    expect(result.data.outcome).toBe('answered');
    expect(
      resolveToolVariant(createExampleElicitationTool(), {
        capabilities: new Set([McpClientCapability.McpApp]),
        host: McpHostClient.Claude,
      }).ui,
    ).toBeUndefined();
  });
});
