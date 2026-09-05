import type { OneTrustEnrichedAssessment } from '@transcend-io/privacy-types';
import { describe, expect, it, vi } from 'vitest';

import { syncOneTrustAssessmentToDisk } from '../syncOneTrustAssessmentToDisk.js';

describe('syncOneTrustAssessmentToDisk', () => {
  it('uses injected filesystem and logger dependencies', () => {
    const appendFileSync = vi.fn();
    const writeFileSync = vi.fn();
    const logger = {
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      log: vi.fn(),
      warn: vi.fn(),
    };

    syncOneTrustAssessmentToDisk(
      {
        assessment: { name: 'Assessment' } as OneTrustEnrichedAssessment,
        file: '/tmp/assessments.json',
        index: 0,
        total: 2,
      },
      {
        fs: {
          appendFileSync,
          writeFileSync,
        },
        logger,
      },
    );

    expect(writeFileSync).toHaveBeenCalledWith(
      '/tmp/assessments.json',
      expect.stringContaining('"name":"Assessment"'),
    );
    expect(appendFileSync).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Writing enriched assessment 1 of 2'),
    );
  });
});
