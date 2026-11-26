/**
 * The per-call events `buildMcpServer` writes, and the progress hooks it hands to
 * tool handlers, checked against a real SDK client and server.
 */

import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MCP_LOG_FILE_ENV } from '../src/debug-log.js';
import { getMcpSession } from '../src/mcp-session-context.js';
import { buildMcpServer } from '../src/server/build-server.js';
import { McpTransport } from '../src/server/transport.js';
import { defineTool } from '../src/tools/types.js';
import { z } from '../src/validation/index.js';

interface Seen {
  progressToken?: string | number;
  canNotify: boolean;
}

describe('tools/call lifecycle events', () => {
  let logFile: string;
  let seen: Seen | undefined;

  beforeEach(() => {
    logFile = join(mkdtempSync(join(tmpdir(), 'mcp-lifecycle-')), 'mcp.jsonl');
    vi.stubEnv(MCP_LOG_FILE_ENV, logFile);
    seen = undefined;
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  async function call(
    name: string,
    options: {
      onprogress?: () => void;
      /** Aborts the client's wait, as a host does when its own timeout expires */
      signal?: AbortSignal;
      /** Replaces the probe handler */
      handler?: () => Promise<unknown>;
      /** Runs after the client stops waiting, before the connection closes */
      afterCall?: () => Promise<void>;
    } = {},
  ) {
    const server = buildMcpServer({
      name: 'lifecycle-probe',
      version: '0.0.1',
      tools: [
        defineTool({
          name: 'probe',
          description: 'Reports what the call session offers, for tests.',
          category: 'test',
          readOnly: true,
          requireAuth: false,
          annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
          zodSchema: z.object({
            note: z.string().optional().describe('Free text the probe ignores'),
          }),
          handler:
            options.handler ??
            (async () => {
              const request = getMcpSession()?.request;
              seen = {
                progressToken: request?.progressToken,
                canNotify: typeof request?.sendNotification === 'function',
              };
              return { success: true, data: { secret: 'payload-value' } };
            }),
        }),
      ],
      transport: McpTransport.Stdio,
    });
    const client = new Client({ name: 'cursor', version: '1.0.0' }, { capabilities: {} });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
    try {
      await client.callTool({ name, arguments: { note: 'secret-arg-value' } }, undefined, {
        onprogress: options.onprogress,
        signal: options.signal,
      });
    } catch (error) {
      // Only the abort this case asked for is expected
      if (options.signal?.aborted !== true) throw error;
    }
    await options.afterCall?.();
    await client.close();

    return readFileSync(logFile, 'utf8')
      .trim()
      .split('\n')
      .map(
        (line) =>
          JSON.parse(line) as { event: string; ref?: string; data?: Record<string, unknown> },
      )
      .filter((entry) => entry.event !== 'log');
  }

  it('records receive, handler, and end under one reference', async () => {
    const events = await call('probe');

    expect(events.map((e) => e.event)).toEqual([
      'call.received',
      'handler.start',
      'handler.end',
      'call.end',
    ]);
    expect(new Set(events.map((e) => e.ref)).size).toBe(1);
    expect(events[0]!.data).toMatchObject({ argNames: ['note'], hasProgressToken: false });
    expect(events.find((e) => e.event === 'handler.end')?.data).toMatchObject({ success: true });
    expect(events.at(-1)!.data).toMatchObject({ outcome: 'returned' });
  });

  it('never logs argument values or the result payload', async () => {
    await call('probe');

    const text = readFileSync(logFile, 'utf8');
    expect(text).not.toContain('secret-arg-value');
    expect(text).not.toContain('payload-value');
  });

  it('hands the handler the host progress token and a way to send notifications', async () => {
    const events = await call('probe', { onprogress: () => undefined });

    expect(events[0]!.data).toMatchObject({ hasProgressToken: true });
    expect(seen?.progressToken).toBeDefined();
    expect(seen?.canNotify).toBe(true);
  });

  it('offers no progress token when the host did not ask for progress', async () => {
    await call('probe');

    expect(seen?.progressToken).toBeUndefined();
  });

  it('records the abort when the host gives up mid-handler, and the late end', async () => {
    let release: () => void = () => undefined;
    let started: () => void = () => undefined;
    const handlerStarted = new Promise<void>((resolve) => {
      started = resolve;
    });
    const controller = new AbortController();

    const run = call('probe', {
      signal: controller.signal,
      handler: async () => {
        started();
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return { success: true };
      },
      afterCall: async () => {
        release();
        await vi.waitFor(() => expect(readFileSync(logFile, 'utf8')).toContain('call.end'));
      },
    });
    await handlerStarted;
    controller.abort();
    const events = await run;

    expect(events.map((e) => e.event)).toEqual([
      'call.received',
      'handler.start',
      'call.aborted',
      'handler.end',
      'call.end',
    ]);
  });

  it('does not report an abort for a call that already finished', async () => {
    const events = await call('probe');

    expect(events.map((e) => e.event)).not.toContain('call.aborted');
  });

  it('records a call that fails before the handler runs', async () => {
    const events = await call('missing_tool');

    expect(events.at(-1)).toMatchObject({
      event: 'call.end',
      data: { outcome: 'error', error: expect.stringContaining('Unknown tool') },
    });
  });
});
