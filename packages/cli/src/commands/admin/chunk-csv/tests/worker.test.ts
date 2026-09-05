import type { ChunkOpts } from '@transcend-io/utils';
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
  mChunkOneCsvFile: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../../logger.js', () => ({ logger: h.mLogger }));
vi.mock('@transcend-io/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@transcend-io/utils')>()),
  chunkOneCsvFile: (...a: Parameters<typeof h.mChunkOneCsvFile>) => h.mChunkOneCsvFile(...a),
  extractErrorMessage: (...a: Parameters<typeof h.mExtractErrorMessage>) =>
    h.mExtractErrorMessage(...a),
}));

// Local aliases for convenience
const { mLogger } = h;
const { mExtractErrorMessage } = h;
const { mChunkOneCsvFile } = h;

describe('chunk-csv worker runChild()', () => {
  let workerProcess: FakeWorkerProcessHarness;

  beforeEach(() => {
    workerProcess = fakeWorkerProcess({ workerId: '7' });

    mLogger.info.mockClear();
    mLogger.error.mockClear();
    mExtractErrorMessage.mockClear();
    mChunkOneCsvFile.mockReset();
  });

  afterEach(() => {
    workerProcess.restore();
  });

  it('announces ready, forwards progress during chunking, and reports success', async () => {
    // Arrange
    mChunkOneCsvFile.mockImplementation(((args: ChunkOpts) => {
      args.onProgress(5, 10);
      args.onProgress(10, 10);
      return Promise.resolve();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);

    // Act
    workerProcess.start(runChild);

    // Assert: "ready" sent immediately
    expect(workerProcess.send).toHaveBeenCalledWith({ type: 'ready' });
    expect(mLogger.info).toHaveBeenCalledTimes(1);
    expect(mLogger.info.mock.calls[0][0]).toContain('[w7] ready');

    // Send a task directly to the captured handler (avoid touching real IPC)
    const msg = {
      type: 'task',
      payload: {
        filePath: '/abs/foo.csv',
        options: { outputDir: '/out', clearOutputDir: true, chunkSizeMB: 64 },
      },
    } as const;

    await workerProcess.dispatch(msg);

    expect(mChunkOneCsvFile).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const callArgs = (mChunkOneCsvFile.mock.calls as any)[0]?.[0] as ChunkOpts;
    expect(callArgs).toMatchObject({
      filePath: '/abs/foo.csv',
      outputDir: '/out',
      clearOutputDir: true,
      chunkSizeMB: 64,
    });
    expect(callArgs.onProgress).toEqual(expect.any(Function));

    const sends = workerProcess.sentMessages();
    expect(sends).toContainEqual({
      type: 'progress',
      payload: { filePath: '/abs/foo.csv', processed: 5, total: 10 },
    });
    expect(sends).toContainEqual({
      type: 'progress',
      payload: { filePath: '/abs/foo.csv', processed: 10, total: 10 },
    });
    expect(sends).toContainEqual({
      type: 'result',
      payload: { ok: true, filePath: '/abs/foo.csv' },
    });

    expect(mLogger.error).not.toHaveBeenCalled();
    expect(workerProcess.exit).not.toHaveBeenCalled();
  });

  it('reports failure using extractErrorMessage and logs error locally', async () => {
    // Arrange
    mExtractErrorMessage.mockReturnValue('Boom!');
    mChunkOneCsvFile.mockImplementation(() => {
      throw new Error('nope');
    });

    // Act
    workerProcess.start(runChild);

    const msg = {
      type: 'task',
      payload: {
        filePath: '/abs/bad.csv',
        options: { clearOutputDir: false, chunkSizeMB: 16 },
      },
    } as const;

    await workerProcess.dispatch(msg);

    // Assert
    expect(mLogger.error).toHaveBeenCalledTimes(1);
    const line = mLogger.error.mock.calls[0][0] as string;
    expect(line).toContain('[w7]');
    expect(line).toContain('ERROR');
    expect(line).toContain('/abs/bad.csv');
    expect(line).toContain('Boom!');

    const sends = workerProcess.sentMessages();
    expect(sends).toContainEqual({
      type: 'result',
      payload: { ok: false, filePath: '/abs/bad.csv', error: 'Boom!' },
    });

    expect(workerProcess.exit).not.toHaveBeenCalled();
  });

  it('exits(0) on shutdown message', async () => {
    // Act
    workerProcess.start(runChild);

    await workerProcess.dispatch({ type: 'shutdown' });

    // Assert
    expect(workerProcess.exit).toHaveBeenCalledWith(0);
  });
});
