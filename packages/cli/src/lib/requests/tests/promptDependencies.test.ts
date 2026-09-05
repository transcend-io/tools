import { describe, expect, it, vi } from 'vitest';

import type { CliLogger } from '../../../context.js';
import { filterRows, mapEnumValues, NONE, type RequestPrompt } from '../index.js';

const logger: CliLogger = {
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  log: vi.fn(),
  warn: vi.fn(),
};

describe('request CSV prompt dependencies', () => {
  it('maps enum values with an injected prompt', async () => {
    const prompt: RequestPrompt = async <TAnswers extends object>() =>
      ({ administrator: 'Admin' }) as TAnswers;

    await expect(
      mapEnumValues(['administrator'], ['Admin', 'User'], {}, { prompt }),
    ).resolves.toEqual({
      administrator: 'Admin',
    });
  });

  it('filters rows with an injected prompt', async () => {
    const answers: object[] = [
      { filterColumnName: 'region' },
      { valuesToKeep: ['US'] },
      { filterColumnName: NONE },
    ];
    const prompt: RequestPrompt = async <TAnswers extends object>() => answers.shift() as TAnswers;

    await expect(
      filterRows(
        [
          { id: '1', region: 'US' },
          { id: '2', region: 'CA' },
        ],
        { logger, prompt },
      ),
    ).resolves.toEqual([{ id: '1', region: 'US' }]);
  });
});
