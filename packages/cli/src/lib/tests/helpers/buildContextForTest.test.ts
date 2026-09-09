import { describe, expect, it } from 'vitest';

import { buildContextForTest, TestProcessExitError } from './buildContextForTest.js';

describe('buildContextForTest', () => {
  it('captures process and logger output without changing globals', () => {
    const originalStdoutWrite = process.stdout.write;
    const context = buildContextForTest();

    context.process.stdout.write('out');
    context.process.stderr.write('err');
    context.logger.info(' info');
    context.logger.error(' error');

    expect(context.stdout).toBe('out info\n');
    expect(context.stderr).toBe('err error\n');
    expect(process.stdout.write).toBe(originalStdoutWrite);
  });

  it('provides isolated process inputs', () => {
    const context = buildContextForTest({
      argv: ['node', 'transcend', 'test'],
      cwd: '/test/cwd',
      env: { TEST_CONTEXT_VALUE: 'value' },
      stdinIsTTY: false,
    });

    expect(context.process.argv).toEqual(['node', 'transcend', 'test']);
    expect(context.process.cwd()).toBe('/test/cwd');
    expect(context.process.env.TEST_CONTEXT_VALUE).toBe('value');
    expect(context.process.stdin.isTTY).toBe(false);
    expect(process.env.TEST_CONTEXT_VALUE).toBeUndefined();
  });

  it('records or throws on exit as configured', () => {
    const recordingContext = buildContextForTest({ exitBehavior: 'record' });
    const throwingContext = buildContextForTest();

    recordingContext.process.exit(2);
    expect(recordingContext.exit).toHaveBeenCalledWith(2);

    expect(() => throwingContext.process.exit(3)).toThrow(TestProcessExitError);
    expect(throwingContext.exit).toHaveBeenCalledWith(3);
  });

  it('resets captured output and exit calls', () => {
    const context = buildContextForTest({ exitBehavior: 'record' });
    context.process.stdout.write('out');
    context.process.stderr.write('err');
    context.process.exit(1);

    context.reset();

    expect(context.stdout).toBe('');
    expect(context.stderr).toBe('');
    expect(context.exit).not.toHaveBeenCalled();
  });
});
