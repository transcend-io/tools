import { describe, expect, it } from 'vitest';

import { buildContextForTest } from '../../tests/helpers/buildContextForTest.js';
import { runCapturedProcess } from '../run-captured-process.js';

describe('runCapturedProcess', () => {
  it('force-kills a process that ignores the timeout signal', async () => {
    const result = await runCapturedProcess(
      process.execPath,
      ['-e', "process.on('SIGTERM', () => {}); setInterval(() => {}, 60_000);"],
      { cwd: process.cwd(), timeoutMs: 500 },
      buildContextForTest({ cwd: process.cwd() }),
    );

    expect(result.code).toBe(1);
    expect(result.timedOut).toBe(true);
    expect(result.signal).toBe('SIGKILL');
  }, 3000);

  it('captures an input pipe error without crashing the parent process', async () => {
    const result = await runCapturedProcess(
      process.execPath,
      ['-e', 'process.exit(1)'],
      { cwd: process.cwd(), input: 'x'.repeat(10 * 1024 * 1024) },
      buildContextForTest({ cwd: process.cwd() }),
    );

    expect(result.code).toBe(1);
    if (result.inputError) {
      expect(result.inputError.code).toBe('EPIPE');
    }
  });
});
