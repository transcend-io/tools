import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { listDirectories } from '../listDirectories.js';
import { listFiles } from '../listFiles.js';

describe('filesystem listing helpers', () => {
  it('listFiles reads through injected filesystem dependencies', () => {
    const existsSync = vi.fn(() => true);
    const readdirSync = vi.fn(() => ['one.yml', 'two.json', 'README']);

    expect(
      listFiles('/config', ['.yml'], true, {
        fs: {
          existsSync: existsSync as unknown as typeof fs.existsSync,
          readdirSync: readdirSync as unknown as typeof fs.readdirSync,
        },
      }),
    ).toEqual(['one']);
    expect(existsSync).toHaveBeenCalledWith('/config');
    expect(readdirSync).toHaveBeenCalledWith('/config');
  });

  it('listDirectories reads through injected filesystem and path dependencies', () => {
    const readdirSync = vi.fn(() => ['first', 'second']);
    const statSync = vi.fn((entryPath: string) => ({
      isDirectory: () => entryPath.endsWith('/first'),
    }));
    const join = vi.fn((...parts: string[]) => parts.join('/'));

    expect(
      listDirectories('/root', {
        fs: {
          readdirSync: readdirSync as unknown as typeof fs.readdirSync,
          statSync: statSync as unknown as typeof fs.statSync,
        },
        path: {
          join: join as unknown as typeof path.join,
        },
      }),
    ).toEqual(['first']);
    expect(join).toHaveBeenCalledWith('/root', 'first');
    expect(join).toHaveBeenCalledWith('/root', 'second');
  });
});
