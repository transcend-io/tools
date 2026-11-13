import { describe, expect, it } from 'vitest';

import { defineTool } from '../src/tools/types.js';
import { z } from '../src/validation/index.js';

const baseConfig = {
  name: 'example_tool',
  description: 'Example tool used to test annotation defaults',
  category: 'Test',
  readOnly: true,
  zodSchema: z.object({}),
  handler: async () => ({}),
};

describe('openWorldHint annotation', () => {
  it('defaults to false when a tool omits it', () => {
    const tool = defineTool({
      ...baseConfig,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    });
    expect(tool.annotations.openWorldHint).toBe(false);
  });

  it('preserves an explicit true and leaves other hints untouched', () => {
    const tool = defineTool({
      ...baseConfig,
      readOnly: false,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    });
    expect(tool.annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    });
  });
});
