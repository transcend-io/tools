import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, stat, utimes, writeFile } from 'node:fs/promises';
import { hostname, tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  LockLostError,
  LockTimeoutError,
  withLockFile,
} from '../src/oauth/credential-store/refresh-lock.js';

let directory: string;
let lockPath: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'oauth-refresh-lock-'));
  lockPath = join(directory, 'test.lock');
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

/** A lock record as another live process on this host would write it. */
function liveRecord(ownerId = randomUUID()): string {
  return JSON.stringify({ pid: process.pid, hostname: hostname(), ownerId });
}

/** A lock record from a process on another host, whose pid cannot be checked. */
function foreignHostRecord(ownerId = randomUUID()): string {
  return JSON.stringify({ pid: process.pid, hostname: `${hostname()}-elsewhere`, ownerId });
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

describe('withLockFile staleness', () => {
  it('does not take over a live lock because its modification time is old', async () => {
    await writeFile(lockPath, foreignHostRecord());
    // The file looks a day old, as if the clock moved. The holder never stopped renewing.
    const old = new Date(Date.now() - 86_400_000);
    await utimes(lockPath, old, old);

    await expect(
      withLockFile(lockPath, async () => 'ran', { timeoutMs: 400, staleMs: 5_000 }),
    ).rejects.toBeInstanceOf(LockTimeoutError);
  });

  it('takes over a lock it watched go unrenewed for the stale window', async () => {
    await writeFile(lockPath, foreignHostRecord());

    const result = await withLockFile(lockPath, async () => 'ran', {
      timeoutMs: 5_000,
      staleMs: 300,
    });

    expect(result).toBe('ran');
  });

  it('keeps waiting while the holder renews inside the stale window', async () => {
    await writeFile(lockPath, foreignHostRecord());
    const renewer = setInterval(() => {
      const now = new Date();
      void utimes(lockPath, now, now).catch(() => undefined);
    }, 50);
    try {
      await expect(
        withLockFile(lockPath, async () => 'ran', { timeoutMs: 900, staleMs: 400 }),
      ).rejects.toBeInstanceOf(LockTimeoutError);
    } finally {
      clearInterval(renewer);
    }
  });

  it('takes over at once when the holder process on this host is gone', async () => {
    await writeFile(
      lockPath,
      JSON.stringify({ pid: 2_000_000_000, hostname: hostname(), ownerId: 'dead' }),
    );

    const result = await withLockFile(lockPath, async () => 'ran', {
      timeoutMs: 2_000,
      staleMs: 60_000,
    });

    expect(result).toBe('ran');
  });
});

describe('withLockFile takeover marker', () => {
  it('does not take over while a fresh marker is held', async () => {
    await writeFile(lockPath, foreignHostRecord());
    await writeFile(`${lockPath}.takeover`, 'someone-else');

    await expect(
      withLockFile(lockPath, async () => 'ran', { timeoutMs: 600, staleMs: 100 }),
    ).rejects.toBeInstanceOf(LockTimeoutError);
    expect(await readFile(`${lockPath}.takeover`, 'utf8')).toBe('someone-else');
  });

  it('clears an aged marker and takes over', async () => {
    await writeFile(lockPath, foreignHostRecord());
    await writeFile(`${lockPath}.takeover`, 'died-mid-takeover');
    const old = new Date(Date.now() - 60_000);
    await utimes(`${lockPath}.takeover`, old, old);

    const result = await withLockFile(lockPath, async () => 'ran', {
      timeoutMs: 5_000,
      staleMs: 200,
    });

    expect(result).toBe('ran');
    expect(await exists(`${lockPath}.takeover`)).toBe(false);
  });
});

describe('withLockFile ownership', () => {
  it('lets the holder pass assertHeld and leaves no files behind', async () => {
    await withLockFile(lockPath, async (assertHeld) => {
      await assertHeld();
    });

    expect(await exists(lockPath)).toBe(false);
    expect(await exists(`${lockPath}.takeover`)).toBe(false);
  });

  it('throws LockLostError from assertHeld after another process took the lock', async () => {
    await expect(
      withLockFile(lockPath, async (assertHeld) => {
        await rm(lockPath, { force: true });
        await writeFile(lockPath, liveRecord('another-owner'));
        await assertHeld();
      }),
    ).rejects.toBeInstanceOf(LockLostError);
  });

  it('does not delete a lock another process took over', async () => {
    const other = liveRecord('another-owner');
    await expect(
      withLockFile(lockPath, async (assertHeld) => {
        await rm(lockPath, { force: true });
        await writeFile(lockPath, other);
        await assertHeld();
      }),
    ).rejects.toBeInstanceOf(LockLostError);

    expect(await readFile(lockPath, 'utf8')).toBe(other);
  });

  it('lets a second holder in after the first releases', async () => {
    const order: string[] = [];
    let firstHasLock!: () => void;
    const firstStarted = new Promise<void>((resolve) => {
      firstHasLock = resolve;
    });
    const first = withLockFile(lockPath, async () => {
      order.push('a:start');
      firstHasLock();
      await new Promise((resolve) => setTimeout(resolve, 100));
      order.push('a:end');
    });
    await firstStarted;
    const second = withLockFile(lockPath, async () => {
      order.push('b:start');
    });
    await Promise.all([first, second]);

    expect(order).toEqual(['a:start', 'a:end', 'b:start']);
  });
});
