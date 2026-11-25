/**
 * What the confirmation gate does while it waits on the summary step.
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { ServerNotification } from '@modelcontextprotocol/sdk/types.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { McpClientCapability, McpHostClient } from '../src/capabilities/types.js';
import { mcpSessionContext, type McpSession } from '../src/mcp-session-context.js';
import {
  CONFIRMATION_DESCRIBE_TIMEOUT_MS,
  ConfirmationPolicy,
  withConfirmation,
} from '../src/tools/confirmation/index.js';
import { PROGRESS_HEARTBEAT_INTERVAL_MS } from '../src/tools/confirmation/progress-heartbeat.js';
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
  notifications: ServerNotification[];
  /** Answers the open form */
  approve: () => void;
}

/** A host whose form stays open until `approve` runs. */
function waitingHost(progressToken?: string | number): Host {
  const notifications: ServerNotification[] = [];
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
      progressToken,
      sendNotification: async (notification) => {
        notifications.push(notification);
      },
    },
  };
  return { session, elicitInput, notifications, approve: () => approve() };
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

describe('progress while waiting for approval', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('sends increasing progress notifications with the host token while the form is open', async () => {
    const host = waitingHost('tok-1');
    const run = mcpSessionContext.run(host.session, async () =>
      gated().handler({ requestId: 'r' }),
    );

    await vi.advanceTimersByTimeAsync(PROGRESS_HEARTBEAT_INTERVAL_MS * 2 + 1);
    expect(host.notifications.map((n) => n.params)).toEqual([
      expect.objectContaining({ progressToken: 'tok-1', progress: 1 }),
      expect.objectContaining({ progressToken: 'tok-1', progress: 2 }),
    ]);
    expect(host.notifications.every((n) => n.method === 'notifications/progress')).toBe(true);

    host.approve();
    await run;
  });

  it('stops once the form is answered', async () => {
    const host = waitingHost('tok-1');
    const run = mcpSessionContext.run(host.session, async () =>
      gated().handler({ requestId: 'r' }),
    );

    await vi.advanceTimersByTimeAsync(PROGRESS_HEARTBEAT_INTERVAL_MS + 1);
    host.approve();
    await run;
    const sent = host.notifications.length;

    await vi.advanceTimersByTimeAsync(PROGRESS_HEARTBEAT_INTERVAL_MS * 3);
    expect(host.notifications).toHaveLength(sent);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('sends nothing when the host did not ask for progress', async () => {
    const host = waitingHost(undefined);
    const run = mcpSessionContext.run(host.session, async () =>
      gated().handler({ requestId: 'r' }),
    );

    await vi.advanceTimersByTimeAsync(PROGRESS_HEARTBEAT_INTERVAL_MS * 3);
    expect(host.notifications).toHaveLength(0);

    host.approve();
    await run;
  });
});