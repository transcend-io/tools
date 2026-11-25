import { join } from 'node:path';

import { describe, it, expect, vi } from 'vitest';

import { revealInFileManager, type PoolingOsPorts } from '../os.js';

/**
 * Build operating-system ports for a platform.
 *
 * @param platform - Platform returned by the injected dependency.
 * @returns Injected ports and spawn spy.
 */
function makePorts(platform: NodeJS.Platform): {
  /** Ports passed to the helper. */
  ports: PoolingOsPorts;
  /** Child-process spawn spy. */
  spawn: ReturnType<typeof vi.fn>;
} {
  const spawn = vi.fn(() => ({ unref: vi.fn() }));
  return {
    ports: {
      platform: () => platform,
      spawn: spawn as unknown as PoolingOsPorts['spawn'],
    },
    spawn,
  };
}

describe('revealInFileManager', () => {
  it('returns false for empty path or paths starting with "("', () => {
    const { ports, spawn } = makePorts('linux');
    expect(revealInFileManager('', ports)).toBe(false);
    expect(revealInFileManager('(temp)', ports)).toBe(false);
    expect(spawn).not.toHaveBeenCalled();
  });

  it('darwin: uses open -R <path>', () => {
    const { ports, spawn } = makePorts('darwin');

    const ok = revealInFileManager('/Users/me/movie.mov', ports);
    expect(ok).toBe(true);
    expect(spawn).toHaveBeenCalledWith('open', ['-R', '/Users/me/movie.mov'], {
      stdio: 'ignore',
      detached: true,
    });
  });

  it('win32: uses explorer.exe /select, <path>', () => {
    const { ports, spawn } = makePorts('win32');

    const ok = revealInFileManager('C:\\Users\\me\\data.csv', ports);
    expect(ok).toBe(true);
    expect(spawn).toHaveBeenCalledWith('explorer.exe', ['/select,', 'C:\\Users\\me\\data.csv'], {
      stdio: 'ignore',
      detached: true,
    });
  });

  it('linux: best-effort xdg-open <dirname(path)>', () => {
    const { ports, spawn } = makePorts('linux');

    const p = '/var/log/app/worker-1.log';
    const ok = revealInFileManager(p, ports);
    expect(ok).toBe(true);
    expect(spawn).toHaveBeenCalledWith('xdg-open', [join('/var/log/app')], {
      stdio: 'ignore',
      detached: true,
    });
  });
});
