import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  MCP_LOG_FILE_ENV,
  describeToolResult,
  getCallRef,
  isMcpDebugLogEnabled,
  logMcpDebugEvent,
  mirrorLogToDebugFile,
} from '../src/debug-log.js';
import { formatMcpTimeline } from '../src/debug-timeline.js';
import { toolCallContext } from '../src/tool-call-context.js';

const CONTEXT = {
  toolName: 'consent_deploy_bundle',
  correlationId: '1a2b3c4d-aaaa-bbbb-cccc-dddddddddddd',
  requestId: 3,
};

describe('debug log', () => {
  let dir: string;
  let file: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'mcp-debug-log-'));
    file = join(dir, 'a', 'b', 'mcp.jsonl');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function readLines(): Array<Record<string, any>> {
    return readFileSync(file, 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
  }

  it('does nothing and reports off when the variable is unset', () => {
    vi.stubEnv(MCP_LOG_FILE_ENV, '');
    expect(isMcpDebugLogEnabled()).toBe(false);
    logMcpDebugEvent('x');
    expect(() => readFileSync(file)).toThrow();
  });

  it('creates missing directories and appends one JSON object per line', () => {
    vi.stubEnv(MCP_LOG_FILE_ENV, file);
    toolCallContext.run(CONTEXT, () => {
      logMcpDebugEvent('first', { n: 1 });
      logMcpDebugEvent('second');
    });

    const lines = readLines();
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({
      event: 'first',
      ref: '1a2b3c4d',
      tool: 'consent_deploy_bundle',
      requestId: 3,
      data: { n: 1 },
    });
    expect(lines[1]!.data).toBeUndefined();
  });

  it('exposes the call reference only inside a call', () => {
    expect(getCallRef()).toBeUndefined();
    expect(toolCallContext.run(CONTEXT, () => getCallRef())).toBe('1a2b3c4d');
  });

  it('does not throw when the file cannot be written, and warns at most once', () => {
    const blocker = join(dir, 'blocker');
    writeFileSync(blocker, '');
    vi.stubEnv(MCP_LOG_FILE_ENV, join(blocker, 'mcp.jsonl'));
    const stderr = vi.spyOn(process.stderr, 'write').mockReturnValue(true);

    expect(() => logMcpDebugEvent('a')).not.toThrow();
    expect(() => logMcpDebugEvent('b')).not.toThrow();

    const warnings = stderr.mock.calls.filter(([text]) => String(text).includes('[mcp-debug-log]'));
    expect(warnings.length).toBeLessThanOrEqual(1);
    stderr.mockRestore();
  });

  it('reduces logger errors to name and message', () => {
    vi.stubEnv(MCP_LOG_FILE_ENV, file);
    mirrorLogToDebugFile('error', 'boom', new TypeError('bad'));

    expect(readLines()[0]!.data).toEqual({
      level: 'error',
      message: 'boom',
      detail: { name: 'TypeError', message: 'bad' },
    });
  });

  it('keeps tool result payloads and error text out of the log', () => {
    expect(
      describeToolResult({
        success: false,
        error: 'customer@example.com',
        code: 'CONFIRMATION_DECLINED',
        data: { x: 1 },
      }),
    ).toEqual({ success: false, code: 'CONFIRMATION_DECLINED' });
    expect(describeToolResult('text')).toEqual({});
  });
});

describe('formatMcpTimeline', () => {
  const base = Date.parse('2026-11-24T23:00:29.000Z');
  const at = (ms: number): string => new Date(base + ms).toISOString();
  const line = (
    ms: number,
    event: string,
    data?: Record<string, unknown>,
    ref = '1a2b3c4d',
  ): string =>
    JSON.stringify({
      ts: at(ms),
      event,
      ref,
      tool: 'consent_deploy_bundle',
      ...(data && { data }),
    });

  it('summarizes a call the host aborted while the form was open', () => {
    const log = [
      line(0, 'call.received', { hasProgressToken: false }),
      line(10, 'confirmation.describe.end', { elapsedMs: 6100, outcome: 'ok' }),
      line(6200, 'confirmation.form.sent'),
      line(60000, 'confirmation.form.abandoned'),
      line(60000, 'call.aborted', { elapsedMs: 60000 }),
      line(60001, 'call.end', { elapsedMs: 60001, outcome: 'returned' }),
    ].join('\n');

    const out = formatMcpTimeline(log);
    expect(out).toContain('1a2b3c4d consent_deploy_bundle 23:00:29Z');
    expect(out).toContain('describe 6.1s ok');
    expect(out).toContain('form sent +6.2s, abandoned +60.0s');
    expect(out).toContain('progress token no, 0 sent');
    expect(out).toContain('ABORTED by host at 60.0s');
  });

  it('summarizes an approved call that finished', () => {
    const log = [
      line(0, 'call.received', { hasProgressToken: true }),
      line(100, 'confirmation.form.sent'),
      line(900, 'progress.sent', { progress: 1 }),
      line(4000, 'confirmation.form.answered', { action: 'accept' }),
      line(6000, 'handler.end', { elapsedMs: 2000, success: true }),
      line(6001, 'call.end', { elapsedMs: 6001, outcome: 'returned' }),
    ].join('\n');

    const out = formatMcpTimeline(log);
    expect(out).toContain('answered +4.0s (accept)');
    expect(out).toContain('handler 2.0s ok');
    expect(out).toContain('progress token yes, 1 sent');
    expect(out).toContain('returned in 6.0s');
  });

  it('flags a call that never logged an end, and tolerates a cut-off last line', () => {
    const log = `${line(0, 'call.received')}\n{"ts":"2026-11-24T23:0`;
    expect(formatMcpTimeline(log)).toContain('no end logged');
  });

  it('keeps calls apart and lists one call in full on request', () => {
    const log = [
      line(0, 'call.received', undefined, 'aaaaaaaa'),
      line(5, 'call.received', undefined, 'bbbbbbbb'),
      line(1000, 'call.end', { elapsedMs: 1000, outcome: 'returned' }, 'aaaaaaaa'),
    ].join('\n');

    expect(formatMcpTimeline(log).split('\n')).toHaveLength(2);
    const detail = formatMcpTimeline(log, { ref: 'aaaaaaaa' });
    expect(detail).toContain('call.received');
    expect(detail).toContain('call.end');
    expect(formatMcpTimeline(log, { ref: 'nope' })).toBe('No events found for ref nope.');
  });

  it('says so when the log has no calls', () => {
    expect(formatMcpTimeline('')).toBe('No tool calls found in the log.');
  });
});
