/**
 * What the confirmation gate does while it waits on the summary step.
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { McpClientCapability, McpHostClient } from '../src/capabilities/types.js';
import { mcpSessionContext, type McpSession } from '../src/mcp-session-context.js';
import {
  CONFIRMATION_DESCRIBE_TIMEOUT_MS,
  ConfirmationPolicy,
  withConfirmation,
} from '../src/tools/confirmation/index.js';
import { defineTool } from '../src/tools/types.js';
import { z } from '../src/validation/index.js';

const SCHEMA = z.object({ requestId: z.string().describe('ID of the request to cancel') });

function gated(describeText?: () => Promise<string>) {
  return withConfirmation(
    defineTool({
      name: 'test_wait',
      description: 'Cancel something, but only once a human has agreed to it.',
      category: 'test',
      readOnly: false,
      confirmation: { hint: 'This permanently cancels the request.', describe: describeText },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
      zodSchema: SCHEMA,
      handler: async () => ({ cancelled: true }),
    }),
    { policy: ConfirmationPolicy.ElicitOnly },
  );
}

interface Host {
  session: McpSession;
  elicitInput: ReturnType<typeof vi.fn>;
  /** Answers the open form */
  approve: () => void;
}

/** A host whose form stays open until `approve` runs. */
function waitingHost(): Host {
  let approve: () => void = () => undefined;
  const elicitInput = vi.fn().mockImplementation(
    () =>
      new Promise((resolve) => {
        approve = () => resolve({ action: 'accept', content: {} });
      }),
  );
  const session: McpSession = {
    client: {
      capabilities: new Set([McpClientCapability.Elicitation]),
      host: McpHostClient.Claude,
    },
    server: { elicitInput } as unknown as Server,
    request: {
      id: 7,
      signal: new AbortController().signal,
      sendNotification: async () => undefined,
    },
  };
  return { session, elicitInput, approve: () => approve() };
}

function formMessage(host: Host): string {
  return (host.elicitInput.mock.calls[0]![0] as { message: string }).message;
}

describe('the summary step', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('gives up after the cap and says it took too long', async () => {
    const host = waitingHost();
    const run = mcpSessionContext.run(host.session, async () =>
      gated(() => new Promise<string>(() => undefined)).handler({ requestId: 'r' }),
    );

    await vi.advanceTimersByTimeAsync(CONFIRMATION_DESCRIBE_TIMEOUT_MS);
    expect(formMessage(host)).toContain('Summary of changes unavailable: it took too long');
    expect(formMessage(host)).toContain('This permanently cancels the request.');

    host.approve();
    await run;
  });

  it('tells the person when loading failed rather than timed out', async () => {
    const host = waitingHost();
    const run = mcpSessionContext.run(host.session, async () =>
      gated(async () => {
        throw new Error('cdn down');
      }).handler({ requestId: 'r' }),
    );

    await vi.advanceTimersByTimeAsync(0);
    expect(formMessage(host)).toContain('Summary of changes unavailable: loading it failed.');
    expect(formMessage(host)).not.toContain('cdn down');

    host.approve();
    await run;
  });

  it('shows the summary when it loads in time and leaves no timer behind', async () => {
    const host = waitingHost();
    const run = mcpSessionContext.run(host.session, async () =>
      gated(async () => 'TEST changed: Core (loadOptions).').handler({ requestId: 'r' }),
    );

    await vi.advanceTimersByTimeAsync(0);
    expect(formMessage(host)).toContain('TEST changed: Core (loadOptions).');

    host.approve();
    await run;
    expect(vi.getTimerCount()).toBe(0);
  });
});