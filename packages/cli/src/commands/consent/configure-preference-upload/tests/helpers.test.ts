import fs, { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, it, expect, vi } from 'vitest';

import { buildSyntheticRows, scanCsvFiles } from '../helpers.js';

const logger = { debug: vi.fn(), info: vi.fn(), log: vi.fn(), warn: vi.fn(), error: vi.fn() };

describe('scanCsvFiles', () => {
  it('merges headers and unique trimmed values across files', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'configure-preference-upload-'));
    const a = join(dir, 'a.csv');
    const b = join(dir, 'b.csv');
    writeFileSync(a, 'email,Marketing\na@example.com, true\nb@example.com,false\n');
    writeFileSync(b, 'email,phone,Marketing\nc@example.com,555,true\n');

    const { headers, uniqueValuesByColumn } = await scanCsvFiles([a, b], { fs, logger });

    expect(headers.sort()).toEqual(['Marketing', 'email', 'phone']);
    expect([...uniqueValuesByColumn.Marketing!].sort()).toEqual(['false', 'true']);
    expect(uniqueValuesByColumn.email!.size).toBe(3);
    expect([...uniqueValuesByColumn.phone!]).toEqual(['555']);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Scanned 2/2 files'));
  });
});

describe('buildSyntheticRows', () => {
  it('covers every value of enum columns and samples the rest', () => {
    const rows = buildSyntheticRows(
      ['email', 'Marketing', 'Sales'],
      {
        email: new Set(['a@example.com', 'b@example.com']),
        Marketing: new Set(['true', 'false', 'unknown']),
        Sales: new Set(['yes']),
      },
      ['Marketing', 'Sales'],
    );

    expect(rows).toEqual([
      { email: 'a@example.com', Marketing: 'true', Sales: 'yes' },
      { email: 'a@example.com', Marketing: 'false', Sales: 'yes' },
      { email: 'a@example.com', Marketing: 'unknown', Sales: 'yes' },
    ]);
  });

  it('returns a single row when there are no enum columns', () => {
    expect(buildSyntheticRows(['email'], { email: new Set(['a@example.com']) })).toEqual([
      { email: 'a@example.com' },
    ]);
  });
});
