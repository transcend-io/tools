/**
 * What the confirmation gate does while it waits: the summary step, the open form,
 * and the progress signal to the host. Also what it writes to the debug log.
 *
 * The host's call limit counts all of this wait, so the properties under test are
 * that the summary step cannot eat the budget, that a host which asked for progress
 * gets it, and that nothing is left running afterwards.
 */

import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { ServerNotification } from '@modelcontextprotocol/sdk/types.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { McpClientCapability, McpHostClient } from '../src/capabilities/types.js';
import { MCP_LOG_FILE_ENV } from '../src/debug-log.js';
import { mcpSessionContext, type McpSession } from '../src/mcp-session-context.js';
import { toolCallContext } from '../src/tool-call-context.js';
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

describe('the debug log', () => {
  let logFile: string;

  beforeEach(() => {
    logFile = join(mkdtempSync(join(tmpdir(), 'mcp-debug-')), 'nested', 'mcp.jsonl');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  async function runLogged() {
    const host = waitingHost('tok-1');
    const run = toolCallContext.run(
      {
        toolName: 'test_wait',
        correlationId: 'abcdef12-0000-0000-0000-000000000000',
        requestId: 7,
      },
      () =>
        mcpSessionContext.run(host.session, async () =>
          gated(async () => 'TEST changed.').handler({ requestId: 'secret-arg-value' }),
        ),
    );
    await vi.waitFor(() => expect(host.elicitInput).toHaveBeenCalled());
    host.approve();
    await run;
    return host;
  }

  function events(): Array<{ event: string; ref?: string; data?: Record<string, unknown> }> {
    return readFileSync(logFile, 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
  }

  it('records the wait, the form, and the decision, tied to one reference', async () => {
    vi.stubEnv(MCP_LOG_FILE_ENV, logFile);
    await runLogged();

    const logged = events();
    expect(logged.map((e) => e.event)).toEqual([
      'progress.heartbeat.start',
      'confirmation.describe.start',
      'confirmation.describe.end',
      'confirmation.form.sent',
      'confirmation.form.answered',
      'confirmation.decision',
    ]);
    expect(new Set(logged.map((e) => e.ref))).toEqual(new Set(['abcdef12']));
    expect(logged.find((e) => e.event === 'progress.heartbeat.start')?.data).toEqual({
      hasProgressToken: true,
      canNotify: true,
    });
    expect(logged.find((e) => e.event === 'confirmation.form.answered')?.data).toMatchObject({
      action: 'accept',
    });
  });

  it('never writes argument values to the log', async () => {
    vi.stubEnv(MCP_LOG_FILE_ENV, logFile);
    await runLogged();

    expect(readFileSync(logFile, 'utf8')).not.toContain('secret-arg-value');
  });

  it('adds the reference to the form so a screenshot finds the events', async () => {
    vi.stubEnv(MCP_LOG_FILE_ENV, logFile);
    const host = await runLogged();

    expect(formMessage(host)).toMatch(/\n\nRef: abcdef12$/);
  });

  it('leaves the form and the disk alone when logging is off', async () => {
    vi.stubEnv(MCP_LOG_FILE_ENV, '');
    const host = await runLogged();

    expect(formMessage(host)).not.toContain('Ref:');
    expect(() => readFileSync(logFile, 'utf8')).toThrow();
  });
});
