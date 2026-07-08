import { describe, expect, it } from 'vitest';

import { createCollectingLogger } from '../collectingLogger.js';

describe('createCollectingLogger', () => {
  it('captures log lines for MCP debug responses', () => {
    const { logger, logs } = createCollectingLogger();

    logger.info('hello');
    logger.error('boom');

    expect(logs).toEqual([
      { level: 'info', message: 'hello' },
      { level: 'error', message: 'boom' },
    ]);
  });
});
