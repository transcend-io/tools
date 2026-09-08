import { describe, expect, it } from 'vitest';

import { filterFileNames } from '../listFiles.js';

describe('filterFileNames', () => {
  it('keeps recognized file names without filesystem access', () => {
    expect(filterFileNames(['transcend.yml', 'notes.txt', 'folder', '.hidden'])).toEqual([
      'transcend.yml',
      'notes.txt',
    ]);
  });

  it('filters and removes configured extensions', () => {
    expect(
      filterFileNames(
        ['first.yml', 'second.yaml', 'third.json', 'archive.yml.bak'],
        ['.yml', '.yaml'],
        true,
      ),
    ).toEqual(['first', 'second']);
  });
});
