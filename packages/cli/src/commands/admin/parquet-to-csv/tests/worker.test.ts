import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  fakeWorkerProcess,
  type FakeWorkerProcessHarness,
} from '../../../../lib/tests/helpers/fakeWorkerProcess.js';
import { runChild } from '../worker.js';

const h = vi.hoisted(() => ({
  mLogger: {
    info: vi.fn(),
    error: vi.fn(),
  },
  mExtractErrorMessage: vi.fn((e: unknown) => String(e)),
  mParquetToCsvOneFile: vi.fn(() => Promise.resolve()),
}));

// Mock EXACT module ids the SUT imports
vi.mock('../../../../logger.js', () => ({ logger: h.mLogger }));
vi.mock('@transcend-io/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@transcend-io/utils')>()),
  extractErrorMessage: (...a: Parameters<typeof h.mExtractErrorMessage>) =>
    h.mExtractErrorMessage(...a),
}));
vi.mock('../../../../lib/helpers/index.js', () => ({
  parquetToCsvOneFile: (...a: Parameters<typeof h.mParquetToCsvOneFile>) =>
    h.mParquetToCsvOneFile(...a),
}));
vi.mock('@duckdb/node-api', () => ({ DuckDBInstance: {} }));

// Aliases
const { mLogger, mExtractErrorMessage, mParquetToCsvOneFile } = h;

describe('parquet-to-csv worker runChild()', () => {
  let workerProcess: FakeWorkerProcessHarness;

  beforeEach(() => {
    workerProcess = fakeWorkerProcess({ workerId: '7' });

    mLogger.info.mockClear();
    mLogger.error.mockClear();
    mExtractErrorMessage.mockClear();
    mParquetToCsvOneFile.mockReset();
  });

  afterEach(() => {
    workerProcess.restore();
  });

  it('announces ready, forwards progress from parquetToCsvOneFile, and reports success', async () => {
    // Make the helper fire progress twice, then resolve
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mParquetToCsvOneFile.mockImplementation(((args: any): Promise<void> => {
      args.onProgress?.(3, undefined);
      args.onProgress?.(10, 42);
      return Promise.resolve();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);

    workerProcess.start(runChild);

    // 'ready' should be sent immediately
    expect(workerProcess.send).toHaveBeenCalledWith({ type: 'ready' });
    expect(mLogger.info).toHaveBeenCalledTimes(1);
    expect(mLogger.info.mock.calls[0][0]).toContain('[w7] ready');

    const msg = {
      type: 'task',
      payload: {
        filePath: '/abs/data/input.parquet',
        options: { outputDir: '/tmp/out', clearOutputDir: true },
      },
    } as const;

    await workerProcess.dispatch(msg);

    expect(mParquetToCsvOneFile).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const callArgs = (mParquetToCsvOneFile.mock.calls as any)[0][0];
    expect(callArgs).toMatchObject({
      filePath: '/abs/data/input.parquet',
      outputDir: '/tmp/out',
      clearOutputDir: true,
    });
    expect(callArgs.onProgress).toEqual(expect.any(Function));

    const sends = workerProcess.sentMessages();
    expect(sends).toContainEqual({ type: 'ready' });
    expect(sends).toContainEqual({
      type: 'progress',
      payload: {
        filePath: '/abs/data/input.parquet',
        processed: 3,
        total: undefined,
      },
    });
    expect(sends).toContainEqual({
      type: 'progress',
      payload: {
        filePath: '/abs/data/input.parquet',
        processed: 10,
        total: 42,
      },
    });
    expect(sends).toContainEqual({
      type: 'result',
      payload: { ok: true, filePath: '/abs/data/input.parquet' },
    });

    // Logs
    expect(mLogger.error).not.toHaveBeenCalled();
    expect(mLogger.info.mock.calls.some((c) => String(c[0]).includes('processing'))).toBe(true);

    expect(workerProcess.exit).not.toHaveBeenCalled();
  });

  it('reports failure using extractErrorMessage and logs error', async () => {
    mExtractErrorMessage.mockReturnValue('Boom!');
    mParquetToCsvOneFile.mockImplementation(() => {
      throw new Error('nope');
    });

    workerProcess.start(runChild);

    const msg = {
      type: 'task',
      payload: {
        filePath: '/abs/bad.parquet',
        options: { clearOutputDir: false },
      },
    } as const;

    await workerProcess.dispatch(msg);

    expect(mLogger.error).toHaveBeenCalledTimes(1);
    const errLine = mLogger.error.mock.calls[0][0] as string;
    expect(errLine).toContain('[w7]');
    expect(errLine).toContain('ERROR');
    expect(errLine).toContain('/abs/bad.parquet');

    // We don't assert 'Boom!' in the log line because the worker logs `err.stack || message`.
    // Ensure `extractErrorMessage` was used and the result payload contains the mapped message.
    expect(mExtractErrorMessage).toHaveBeenCalledTimes(1);
    expect(mExtractErrorMessage.mock.calls[0][0]).toBeInstanceOf(Error);

    const sends = workerProcess.sentMessages();
    expect(sends).toContainEqual({
      type: 'result',
      payload: { ok: false, filePath: '/abs/bad.parquet', error: 'Boom!' },
    });

    expect(workerProcess.exit).not.toHaveBeenCalled();
  });

  it('exits(0) on shutdown message', async () => {
    workerProcess.start(runChild);

    await workerProcess.dispatch({ type: 'shutdown' });

    expect(workerProcess.exit).toHaveBeenCalledWith(0);
  });
});
