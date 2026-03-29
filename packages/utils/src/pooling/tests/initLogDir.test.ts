import { readdirSync, writeFileSync, existsSync, unlinkSync, mkdirSync } from 'node:fs';

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { initLogDir } from '../logRotation.js';

vi.mock('node:fs', () => {
  const readdirSync = vi.fn();
  const writeFileSync = vi.fn();
  const existsSync = vi.fn();
  const unlinkSync = vi.fn();
  const mkdirSync = vi.fn();
  return { readdirSync, writeFileSync, existsSync, unlinkSync, mkdirSync };
});

describe('initLogDir', () => {
  const mReaddirSync = vi.mocked(readdirSync);
  const mWriteFileSync = vi.mocked(writeFileSync);
  const mExistsSync = vi.mocked(existsSync);
  const mUnlinkSync = vi.mocked(unlinkSync);
  const mMkdirSync = vi.mocked(mkdirSync);

  beforeEach(() => {
    vi.clearAllMocks();
    mReaddirSync.mockReturnValue([
      'worker-1.log',
      'worker-2.out.log',
      'worker-3.err.log',
      'worker-4.warn.log',
      'worker-5.info.log',
      'worker-6.error.log',
      'other.txt',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any);
  });

  it('creates logs dir and truncates matching files by default', () => {
    const dir = initLogDir('/tmp/root');
    expect(dir).toBe('/tmp/root/logs');

    expect(mMkdirSync).toHaveBeenCalledWith('/tmp/root/logs', { recursive: true });

    expect(mWriteFileSync).toHaveBeenCalledWith('/tmp/root/logs/worker-1.log', '');
    expect(mWriteFileSync).toHaveBeenCalledWith('/tmp/root/logs/worker-2.out.log', '');
    expect(mWriteFileSync).toHaveBeenCalledWith('/tmp/root/logs/worker-3.err.log', '');
    expect(mWriteFileSync).toHaveBeenCalledWith('/tmp/root/logs/worker-4.warn.log', '');
    expect(mWriteFileSync).toHaveBeenCalledWith('/tmp/root/logs/worker-5.info.log', '');
    expect(mWriteFileSync).toHaveBeenCalledWith('/tmp/root/logs/worker-6.error.log', '');

    expect(mUnlinkSync).not.toHaveBeenCalled();
  });

  it('deletes files when resetMode is delete', () => {
    mExistsSync.mockImplementation((pRaw) => {
      const p = String(pRaw);
      return p.endsWith('worker-1.log') || p.endsWith('worker-2.out.log');
    });

    const dir = initLogDir('/var/data', { resetMode: 'delete' });
    expect(dir).toBe('/var/data/logs');

    expect(mMkdirSync).toHaveBeenCalledWith('/var/data/logs', { recursive: true });

    expect(mUnlinkSync).toHaveBeenCalledWith('/var/data/logs/worker-1.log');
    expect(mUnlinkSync).toHaveBeenCalledWith('/var/data/logs/worker-2.out.log');

    expect(mWriteFileSync).toHaveBeenCalledWith('/var/data/logs/worker-3.err.log', '');
    expect(mWriteFileSync).toHaveBeenCalledWith('/var/data/logs/worker-4.warn.log', '');
    expect(mWriteFileSync).toHaveBeenCalledWith('/var/data/logs/worker-5.info.log', '');
    expect(mWriteFileSync).toHaveBeenCalledWith('/var/data/logs/worker-6.error.log', '');
  });
});
