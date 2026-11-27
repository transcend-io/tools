import { createHash, randomUUID } from 'node:crypto';
import { open, rm, stat, utimes } from 'node:fs/promises';
import { hostname } from 'node:os';
import { dirname, join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

import { z } from 'zod';

import { ensurePrivateDirectory, isErrnoException, readFileIfExists } from './config-directory.js';

/** A lock a waiter watched go unrenewed for this long is treated as abandoned. */
export const REFRESH_LOCK_STALE_MS = 30_000;

/** How often a holder renews its lock. Several renewals fit in the stale window. */
const LOCK_RENEW_MS = 5_000;

/** How often a waiting process retries the lock. */
const LOCK_RETRY_MS = 50;

/** How long to wait for a lock before giving up; longer than the stale window. */
const LOCK_WAIT_TIMEOUT_MS = 45_000;

/** A takeover marker older than this was left by a process that died mid-takeover. */
const TAKEOVER_MARKER_STALE_MS = 5_000;

/** How long a holder waits for the takeover marker before it treats its lock as lost. */
const TAKEOVER_MARKER_WAIT_MS = TAKEOVER_MARKER_STALE_MS + 1_000;

/** How often a process retries the takeover marker. */
const MARKER_RETRY_MS = 10;

const LockRecordSchema = z.object({
  pid: z.number().int().positive(),
  /** Host that wrote the lock. A pid means nothing on another host. */
  hostname: z.string().min(1),
  ownerId: z.string().min(1),
});

/** Raised when another process held the lock for the whole wait. */
export class LockTimeoutError extends Error {
  constructor(lockPath: string) {
    super(`Timed out waiting for the lock at ${lockPath}`);
    this.name = 'LockTimeoutError';
  }
}

/** Raised when the holder finds its lock was taken over while it worked. */
export class LockLostError extends Error {
  constructor(lockPath: string) {
    super(`Lost the lock at ${lockPath} while holding it`);
    this.name = 'LockLostError';
  }
}

/** Throws {@link LockLostError} unless the caller still holds the lock. */
export type AssertLockHeld = () => Promise<void>;

export interface LockFileOptions {
  /** How long to wait for the lock before throwing {@link LockTimeoutError} */
  timeoutMs?: number;
  /** How long a lock may go without a renewal before it is taken over */
  staleMs?: number;
  /** How often the holder renews the lock */
  renewMs?: number;
}

/** A lock file as last seen by a waiting process. */
interface ObservedLock {
  /** Exact file content, used to recognize the same lock again */
  raw: string;
  /** Modification time, which changes each time the holder renews */
  modifiedAtMs: number;
  /** Whether the pid in the lock is gone on this host */
  isHolderGone: boolean;
}

/** Path of the lock that serializes refreshes of one saved login. */
export function refreshLockPath(directory: string, key: string): string {
  const digest = createHash('sha256').update(key).digest('hex').slice(0, 32);
  return join(directory, `refresh-${digest}.lock`);
}

function parseLockRecord(raw: string): z.infer<typeof LockRecordSchema> | null {
  try {
    const parsed = LockRecordSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // Anything but "no such process" (for example EPERM) means it exists.
    return !isErrnoException(error, 'ESRCH');
  }
}

/** Creates `path` only if it does not exist. Returns false when it already does. */
async function createExclusive(path: string, content: string): Promise<boolean> {
  let handle: Awaited<ReturnType<typeof open>>;
  try {
    handle = await open(path, 'wx', 0o600);
  } catch (error) {
    if (isErrnoException(error, 'EEXIST')) return false;
    throw error;
  }
  try {
    await handle.writeFile(content);
  } finally {
    await handle.close();
  }
  return true;
}

async function modifiedAt(path: string): Promise<number | null> {
  try {
    return (await stat(path)).mtimeMs;
  } catch (error) {
    if (isErrnoException(error, 'ENOENT')) return null;
    throw error;
  }
}

/**
 * Reads a lock and checks whether its holder's process is gone.
 *
 * The pid check only shortens the wait after a crash, and only for a lock
 * written on this host; a reused pid is caught by the renewal watch instead.
 */
async function observeLock(lockPath: string): Promise<ObservedLock | null> {
  const raw = await readFileIfExists(lockPath);
  const modifiedAtMs = raw === null ? null : await modifiedAt(lockPath);
  if (raw === null || modifiedAtMs === null) return null;

  const record = parseLockRecord(raw);
  const isHolderGone =
    record !== null && record.hostname === hostname() && !isProcessAlive(record.pid);
  return { raw, modifiedAtMs, isHolderGone };
}

/** Whether `observed` is the same lock, at the same renewal, as `before`. */
function isSameRenewal(observed: ObservedLock, before: ObservedLock): boolean {
  return observed.raw === before.raw && observed.modifiedAtMs === before.modifiedAtMs;
}

/**
 * Runs `run` while holding the takeover marker, so that checking a lock and
 * changing it happen as one step. Resolves `NOT_ACQUIRED` when the marker stays
 * busy for `waitMs`.
 *
 * The marker holds a random ID. Only the process that wrote it removes it, so a
 * holder that stalled past the stale limit cannot delete the next process's marker.
 */
const NOT_ACQUIRED = Symbol('not acquired');

async function withTakeoverMarker<T>(
  lockPath: string,
  waitMs: number,
  run: () => Promise<T>,
): Promise<T | typeof NOT_ACQUIRED> {
  const markerPath = `${lockPath}.takeover`;
  const markerId = randomUUID();
  const waitStartedAt = performance.now();
  while (!(await createExclusive(markerPath, markerId))) {
    const seen = await readFileIfExists(markerPath);
    const seenModifiedAt = seen === null ? null : await modifiedAt(markerPath);
    const isOrphaned =
      seenModifiedAt !== null && Date.now() - seenModifiedAt > TAKEOVER_MARKER_STALE_MS;
    // Remove it only if it is still the marker that was judged orphaned.
    if (isOrphaned && (await readFileIfExists(markerPath)) === seen) {
      await rm(markerPath, { force: true });
      continue;
    }
    if (performance.now() - waitStartedAt >= waitMs) return NOT_ACQUIRED;
    await sleep(MARKER_RETRY_MS);
  }

  try {
    return await run();
  } finally {
    if ((await readFileIfExists(markerPath)) === markerId) {
      await rm(markerPath, { force: true });
    }
  }
}

/**
 * Removes an abandoned lock.
 *
 * Two waiters can judge the same lock abandoned. The marker lets one process at
 * a time look again, and it deletes the lock only if it is the same lock, at the
 * same renewal, or its process is gone. A holder that renews, checks, or
 * releases takes the same marker, so none of them is cut in half by a takeover.
 */
async function removeStaleLock(lockPath: string, judged: ObservedLock): Promise<void> {
  await withTakeoverMarker(lockPath, 0, async () => {
    const current = await observeLock(lockPath);
    if (current && isSameRenewal(current, judged)) {
      await rm(lockPath, { force: true });
    }
  });
}

async function acquireLock(
  lockPath: string,
  ownerId: string,
  timeoutMs: number,
  staleMs: number,
): Promise<void> {
  const record = JSON.stringify({ pid: process.pid, hostname: hostname(), ownerId });
  const waitStartedAt = performance.now();
  /**
   * The lock this waiter is watching, and when it first saw that renewal.
   *
   * Staleness is the time this waiter watched the lock go unrenewed, on the
   * monotonic clock. The file's modification time is compared only with itself,
   * never with the wall clock: after a sleep or a clock step, every live lock
   * would otherwise look abandoned.
   */
  let watched: { lock: ObservedLock; since: number } | null = null;
  for (;;) {
    if (await createExclusive(lockPath, record)) return;

    const observed = await observeLock(lockPath);
    if (!observed) {
      watched = null;
    } else {
      if (!watched || !isSameRenewal(observed, watched.lock)) {
        watched = { lock: observed, since: performance.now() };
      }
      if (observed.isHolderGone || performance.now() - watched.since >= staleMs) {
        await removeStaleLock(lockPath, observed);
      }
    }
    if (performance.now() - waitStartedAt >= timeoutMs) {
      throw new LockTimeoutError(lockPath);
    }
    await sleep(LOCK_RETRY_MS);
  }
}

async function isLockHeldBy(lockPath: string, ownerId: string): Promise<boolean> {
  const raw = await readFileIfExists(lockPath);
  return raw !== null && parseLockRecord(raw)?.ownerId === ownerId;
}

async function releaseLock(lockPath: string, ownerId: string): Promise<void> {
  // A lock that went unrenewed may have been taken over; leave that one alone.
  const remove = async (): Promise<void> => {
    if (await isLockHeldBy(lockPath, ownerId)) await rm(lockPath, { force: true });
  };
  // If the marker stays busy, release without it: a lock left behind would block
  // every waiter until it aged out.
  if ((await withTakeoverMarker(lockPath, TAKEOVER_MARKER_WAIT_MS, remove)) === NOT_ACQUIRED) {
    await remove();
  }
}

/**
 * Runs `task` while holding an exclusive lock file.
 *
 * The file records the pid and a random owner ID. The owner ID, not the pid,
 * decides who holds the lock, so two holders in one process still exclude each
 * other. The holder renews the lock while `task` runs. A lock is taken over only
 * when its process is gone or a waiter has watched it go
 * {@link REFRESH_LOCK_STALE_MS} without a renewal.
 *
 * A holder that was suspended (a sleeping laptop) can lose its lock without
 * knowing. `task` receives {@link AssertLockHeld}; call it right before any
 * step that must not run twice, such as spending a refresh token.
 */
export async function withLockFile<T>(
  lockPath: string,
  task: (assertHeld: AssertLockHeld) => Promise<T>,
  options: LockFileOptions = {},
): Promise<T> {
  const {
    timeoutMs = LOCK_WAIT_TIMEOUT_MS,
    staleMs = REFRESH_LOCK_STALE_MS,
    renewMs = LOCK_RENEW_MS,
  } = options;
  const ownerId = randomUUID();
  await ensurePrivateDirectory(dirname(lockPath));
  await acquireLock(lockPath, ownerId, timeoutMs, staleMs);

  const renewal = setInterval(() => {
    // A missed renewal is not fatal: the next one lands well inside the stale window.
    // Renew only our own lock, never a file another process put at this path.
    isLockHeldBy(lockPath, ownerId)
      .then((isHeld) => (isHeld ? utimes(lockPath, new Date(), new Date()) : undefined))
      .catch(() => undefined);
  }, renewMs);
  renewal.unref();

  const assertHeld: AssertLockHeld = async () => {
    // Under the marker, so no waiter can remove the lock between the check and the
    // renewal. The fresh renewal also resets every waiter's watch.
    const isHeld = await withTakeoverMarker(lockPath, TAKEOVER_MARKER_WAIT_MS, async () => {
      if (!(await isLockHeldBy(lockPath, ownerId))) return false;
      await utimes(lockPath, new Date(), new Date());
      return true;
    });
    if (isHeld !== true) throw new LockLostError(lockPath);
  };

  try {
    return await task(assertHeld);
  } finally {
    clearInterval(renewal);
    await releaseLock(lockPath, ownerId);
  }
}
