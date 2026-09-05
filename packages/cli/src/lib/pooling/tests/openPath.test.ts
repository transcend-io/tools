import { describe, it, expect, vi } from 'vitest';

import { openPath, type PoolingOsPorts } from '../os.js';

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

describe('openPath', () => {
  it('returns false for empty path or paths starting with "("', () => {
    const { ports, spawn } = makePorts('linux');
    expect(openPath('', ports)).toBe(false);
    expect(openPath('(temporary)', ports)).toBe(false);
    expect(spawn).not.toHaveBeenCalled();
  });

  it('windows: uses cmd /c start "" <path>', () => {
    const { ports, spawn } = makePorts('win32');

    const ok = openPath('C:\\foo\\bar.txt', ports);

    expect(ok).toBe(true);
    expect(spawn).toHaveBeenCalledWith('cmd', ['/c', 'start', '', 'C:\\foo\\bar.txt'], {
      stdio: 'ignore',
      detached: true,
    });
  });

  it('darwin: uses xdg-open (best-effort) as coded', () => {
    const { ports, spawn } = makePorts('darwin');

    const ok = openPath('/Users/me/file.pdf', ports);

    expect(ok).toBe(true);
    expect(spawn).toHaveBeenCalledWith('xdg-open', ['/Users/me/file.pdf'], {
      stdio: 'ignore',
      detached: true,
    });
  });

  it('linux: uses xdg-open <path>', () => {
    const { ports, spawn } = makePorts('linux');

    const ok = openPath('/tmp/a.png', ports);

    expect(ok).toBe(true);
    expect(spawn).toHaveBeenCalledWith('xdg-open', ['/tmp/a.png'], {
      stdio: 'ignore',
      detached: true,
    });
  });
});
