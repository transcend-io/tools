import { describe, expect, it } from 'vitest';

import { getTranscendConfigurationSchema } from '../getTranscendConfigurationSchema.js';

describe('getTranscendConfigurationSchema', () => {
  it('exports a JSON schema with purposes and preference-options keys', () => {
    const schema = getTranscendConfigurationSchema();

    expect(schema.type).toBe('object');
    expect(schema.properties).toHaveProperty('purposes');
    expect(schema.properties).toHaveProperty('preference-options');
    expect(schema.properties).toHaveProperty('consent-workflow-triggers');
  });
});
