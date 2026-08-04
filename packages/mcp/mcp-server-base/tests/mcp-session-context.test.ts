import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { ElicitRequestFormParams, ElicitResult } from '@modelcontextprotocol/sdk/types.js';
import { describe, expect, it, vi } from 'vitest';

import { McpClientCapability, McpHostClient } from '../src/capabilities/types.js';
import {
  getMcpSession,
  hasCapability,
  mcpSessionContext,
  requestElicitation,
  type McpSession,
} from '../src/mcp-session-context.js';
// The SDK's own type rather than this package's `ElicitFormSchema` alias, so a
// test of the session layer does not reach into the tool-variant module.
const SCHEMA: ElicitRequestFormParams['requestedSchema'] = {
  type: 'object',
  properties: { name: { type: 'string', description: 'Name to greet in the response.' } },
};

/** A session whose server records what the layer asked the host for. */
function sessionWith(
  capabilities: McpClientCapability[],
  answer: ElicitResult = { action: 'accept', content: { name: 'Katherine' } },
): { session: McpSession; elicitInput: ReturnType<typeof vi.fn> } {
  const elicitInput = vi.fn().mockResolvedValue(answer);
  return {
    session: {
      client: { capabilities: new Set(capabilities), host: McpHostClient.Claude },
      server: { elicitInput } as unknown as Server,
    },
    elicitInput,
  };
}

describe('getMcpSession and hasCapability', () => {
  it('report no session and no capabilities outside a request', () => {
    // A unit test that calls a handler directly has no session, and that has to
    // mean "take the baseline path" rather than "throw".
    expect(getMcpSession()).toBeUndefined();
    expect(hasCapability(McpClientCapability.McpApp)).toBe(false);
  });

  it('expose the host being served inside a request', () => {
    const { session } = sessionWith([McpClientCapability.McpApp]);

    mcpSessionContext.run(session, () => {
      expect(getMcpSession()?.client.host).toBe(McpHostClient.Claude);
      expect(hasCapability(McpClientCapability.McpApp)).toBe(true);
      expect(hasCapability(McpClientCapability.Elicitation)).toBe(false);
    });
  });
});

describe('requestElicitation', () => {
  it('returns undefined outside a request, since there is no host to ask', async () => {
    await expect(requestElicitation('Who?', SCHEMA)).resolves.toBeUndefined();
  });

  it('does not ask a host that never declared elicitation', async () => {
    // The gate matters: the SDK's elicitInput checks the declared capability and
    // throws, so skipping it here is what lets a handler fall back cleanly
    // instead of failing the tool call.
    const { session, elicitInput } = sessionWith([McpClientCapability.McpApp]);

    await mcpSessionContext.run(session, async () => {
      await expect(requestElicitation('Who?', SCHEMA)).resolves.toBeUndefined();
    });
    expect(elicitInput).not.toHaveBeenCalled();
  });

  it('asks in form mode and returns the answer the host collected', async () => {
    const { session, elicitInput } = sessionWith([McpClientCapability.Elicitation]);

    await mcpSessionContext.run(session, async () => {
      const result = await requestElicitation('Who should this greeting be addressed to?', SCHEMA);
      expect(result).toEqual({ action: 'accept', content: { name: 'Katherine' } });
    });

    expect(elicitInput).toHaveBeenCalledWith({
      mode: 'form',
      message: 'Who should this greeting be addressed to?',
      requestedSchema: SCHEMA,
    });
  });

  it('passes a declined form back to the caller rather than treating it as an answer', async () => {
    const { session } = sessionWith([McpClientCapability.Elicitation], { action: 'decline' });

    await mcpSessionContext.run(session, async () => {
      await expect(requestElicitation('Who?', SCHEMA)).resolves.toEqual({ action: 'decline' });
    });
  });
});
