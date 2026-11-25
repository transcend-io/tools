import { Buffer } from 'node:buffer';

import { CustomFunctionType } from '@transcend-io/privacy-types';
import { describe, expect, it } from 'vitest';

import { runCapturedProcess } from '../../cli/run-captured-process.js';
import { buildContextForTest } from '../../tests/helpers/buildContextForTest.js';
import { buildLocalSimulatorInvocation } from '../local-simulator.js';

describe('local Custom Function simulator with Deno 2', () => {
  it('executes the selected export with payload, environment, SDK, and KV', async () => {
    const invocation = buildLocalSimulatorInvocation(
      {
        name: 'Local example',
        type: CustomFunctionType.General,
        code: `export default async function ({ payload, environment, sdk, kv }) {
  console.log('payload', payload.event, payload.coreIdentifier.value);
  console.log('environment', environment.MESSAGE);
  await kv.set('example', 'stored');
  console.log('kv', await kv.get('example'));
  const response = await sdk.fetch('/v1/example', { method: 'POST' });
  console.log('sdk', response.status, sdk.nonce());
}`,
        env: { MESSAGE: 'hello' },
      },
      { payload: { event: 'fixture' } },
    );
    const context = buildContextForTest({ cwd: process.cwd() });

    const result = await runCapturedProcess(
      'deno',
      invocation.args,
      {
        cwd: process.cwd(),
        input: invocation.input,
        env: invocation.env,
        timeoutMs: invocation.timeoutMs,
      },
      context,
    );

    expect(result.code, result.stderr).toBe(0);
    expect(result.stdout).toContain('payload fixture example-identifier');
    expect(result.stdout).toContain('environment hello');
    expect(result.stdout).toContain('kv stored');
    expect(result.stdout).toContain('sdk 200 local-simulator');
    expect(result.stderr).toContain(
      '[simulator] sdk.fetch POST /v1/example -> HTTP 200 (request not sent)',
    );
  }, 30_000);

  it('exits after the handler resolves even when it leaves a timer active', async () => {
    const invocation = buildLocalSimulatorInvocation(
      {
        name: 'Lingering timer',
        code: `export default function () {
  setInterval(() => {}, 60_000);
  console.log('handler returned');
}`,
      },
      { payload: {} },
    );
    const context = buildContextForTest({ cwd: process.cwd() });

    const result = await runCapturedProcess(
      'deno',
      invocation.args,
      {
        cwd: process.cwd(),
        input: invocation.input,
        env: invocation.env,
        timeoutMs: 1000,
      },
      context,
    );

    expect(result.code, result.stderr).toBe(0);
    expect(result.stdout).toContain('handler returned');
  }, 30_000);

  it('caps captured output while continuing to drain the process', async () => {
    const invocation = buildLocalSimulatorInvocation(
      {
        name: 'Noisy',
        code: `export default function () {
  console.log('x'.repeat(2048));
}`,
      },
      { payload: {} },
    );
    const context = buildContextForTest({ cwd: process.cwd() });

    const result = await runCapturedProcess(
      'deno',
      invocation.args,
      {
        cwd: process.cwd(),
        input: invocation.input,
        env: invocation.env,
        timeoutMs: invocation.timeoutMs,
        maxOutputBytes: 100,
      },
      context,
    );

    expect(result.code, result.stderr).toBe(0);
    expect(Buffer.byteLength(result.stdout)).toBeLessThanOrEqual(100);
    expect(result.outputTruncated).toBe(true);
  }, 30_000);

  it('denies native network calls by default', async () => {
    const invocation = buildLocalSimulatorInvocation(
      {
        name: 'Network denied',
        code: `export default async function () {
  await fetch('https://example.com');
}`,
        allowedHosts: ['example.com'],
      },
      { payload: {} },
    );
    const context = buildContextForTest({ cwd: process.cwd() });

    const result = await runCapturedProcess(
      'deno',
      invocation.args,
      {
        cwd: process.cwd(),
        input: invocation.input,
        env: invocation.env,
        timeoutMs: invocation.timeoutMs,
      },
      context,
    );

    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/Requires net access|NotCapable/u);
  }, 30_000);

  it('denies npm modules when third-party imports are disabled', async () => {
    const invocation = buildLocalSimulatorInvocation(
      {
        name: 'NPM denied',
        code: `import isNumber from 'npm:is-number@7.0.0';
export default function () {
  console.log(isNumber(1));
}`,
      },
      { payload: {} },
    );
    const context = buildContextForTest({ cwd: process.cwd() });

    const result = await runCapturedProcess(
      'deno',
      invocation.args,
      {
        cwd: process.cwd(),
        input: invocation.input,
        env: invocation.env,
        timeoutMs: invocation.timeoutMs,
      },
      context,
    );

    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/npm.*disabled|--no-npm/iu);
  }, 30_000);

  it('applies a function-defined PATH after resolving Deno with the parent PATH', async () => {
    const invocation = buildLocalSimulatorInvocation(
      {
        name: 'Custom path',
        code: `export default function () {
  console.log(Deno.env.get('PATH'));
}`,
        env: { PATH: '/custom/bin' },
      },
      { payload: {} },
    );
    const context = buildContextForTest({ cwd: process.cwd() });

    const result = await runCapturedProcess(
      'deno',
      invocation.args,
      {
        cwd: process.cwd(),
        input: invocation.input,
        env: invocation.env,
        timeoutMs: invocation.timeoutMs,
      },
      context,
    );

    expect(result.code, result.stderr).toBe(0);
    expect(result.stdout.trim()).toBe('/custom/bin');
  }, 30_000);
});
