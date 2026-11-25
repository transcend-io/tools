import { describe, it, expect, vi, type Mock } from 'vitest';

import { copyToClipboard, type PoolingOsPorts } from '../os.js';

/**
 * Build a fake child process with a writable-like stdin.
 *
 * @returns fake child with stdin.end spy
 */
function makeChild(): {
  /** standard input */
  stdin: {
    /** Spy for end method */
    end: Mock;
  };
} {
  const end = vi.fn();
  return {
    stdin: {
      end,
    },
  };
}

/**
 * Build operating-system ports for a platform.
 *
 * @param platform - Platform returned by the injected dependency.
 * @param spawn - Child-process spawn implementation.
 * @returns Ports passed to the helper.
 */
function makePorts(platform: NodeJS.Platform, spawn: ReturnType<typeof vi.fn>): PoolingOsPorts {
  return {
    platform: () => platform,
    spawn: spawn as unknown as PoolingOsPorts['spawn'],
  };
}

describe('copyToClipboard', () => {
  it('returns false for empty text or text starting with "("', () => {
    const spawn = vi.fn();
    const ports = makePorts('linux', spawn);
    expect(copyToClipboard('', ports)).toBe(false);
    expect(copyToClipboard('(internal) Copy this', ports)).toBe(false);
    expect(spawn).not.toHaveBeenCalled();
  });

  it('darwin: uses pbcopy and writes text as-is', () => {
    const child = makeChild();
    const spawn = vi.fn(() => child);

    const ok = copyToClipboard('hello\nworld', makePorts('darwin', spawn));
    expect(ok).toBe(true);
    expect(spawn).toHaveBeenCalledWith('pbcopy');
    expect(child.stdin.end).toHaveBeenCalledWith('hello\nworld');
  });

  it('win32: uses clip and converts LF to CRLF', () => {
    const child = makeChild();
    const spawn = vi.fn(() => child);

    const ok = copyToClipboard('a\nb\nc', makePorts('win32', spawn));
    expect(ok).toBe(true);
    expect(spawn).toHaveBeenCalledWith('clip');
    expect(child.stdin.end).toHaveBeenCalledWith('a\r\nb\r\nc');
  });

  it('linux: prefers xclip; on error falls back to xsel', () => {
    const child = makeChild();
    // Two-phase behavior: first call (xclip) throws, second (xsel) returns child
    const spawn = vi.fn().mockImplementationOnce(() => {
      throw new Error('xclip missing');
    });
    spawn.mockImplementationOnce(() => child);

    const ok = copyToClipboard('linux text', makePorts('linux', spawn));
    expect(ok).toBe(true);

    // First attempt: xclip with -selection clipboard
    expect(spawn).toHaveBeenNthCalledWith(1, 'xclip', ['-selection', 'clipboard']);
    // Fallback: xsel --clipboard --input
    expect(spawn).toHaveBeenNthCalledWith(2, 'xsel', ['--clipboard', '--input']);
    expect(child.stdin.end).toHaveBeenCalledWith('linux text');
  });

  it('linux: returns false if both xclip and xsel fail', () => {
    const spawn = vi.fn(() => {
      throw new Error('no clipboard utility');
    });

    const ok = copyToClipboard('nope', makePorts('linux', spawn));
    expect(ok).toBe(false);

    // xclip attempted
    expect(spawn).toHaveBeenCalledWith('xclip', ['-selection', 'clipboard']);
    // xsel attempted
    expect(spawn).toHaveBeenCalledWith('xsel', ['--clipboard', '--input']);
  });
});
