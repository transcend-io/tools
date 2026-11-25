import { describe, it, expect, vi } from 'vitest';

import { spawnDetached, type PoolingOsPorts } from '../os.js';

describe('spawnDetached', () => {
  it('spawns with detached+ignore, calls unref, and returns true', () => {
    const unref = vi.fn();
    const spawn = vi.fn(() => ({ unref })) as unknown as PoolingOsPorts['spawn'];

    const ok = spawnDetached('cmd', ['a', 'b'], { spawn });

    expect(ok).toBe(true);
    expect(spawn).toHaveBeenCalledWith('cmd', ['a', 'b'], {
      stdio: 'ignore',
      detached: true,
    });
    expect(unref).toHaveBeenCalledTimes(1);
  });

  it('returns false if spawn throws', () => {
    const spawn = vi.fn(() => {
      throw new Error('boom');
    }) as unknown as PoolingOsPorts['spawn'];

    const ok = spawnDetached('whatever', [], { spawn });
    expect(ok).toBe(false);
  });
});
