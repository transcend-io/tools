import { ConsentManagerInput } from '@transcend-io/privacy-types';
import { ConsentSiteInput } from '@transcend-io/sdk';
import { describe, expect, it } from 'vitest';

import { toolInputSchema } from '../src/tools/input-schema.js';
import { defineTool } from '../src/tools/types.js';
import { codecJsonSchema, ymlItemsSchema, ymlRecordSchema } from '../src/transcend-yml/schema.js';
import { z } from '../src/validation/index.js';

type Node = {
  type?: string;
  description?: string;
  enum?: string[];
  required?: string[];
  properties?: Record<string, Node>;
  items?: Node;
};

describe('codecJsonSchema', () => {
  const schema = codecJsonSchema(ConsentManagerInput) as Node;
  const experience = schema.properties?.experiences?.items as Node;

  it('keeps plain fields', () => {
    expect(schema.properties?.reportOnly).toEqual({ type: 'boolean' });
    expect(schema.properties?.consentPrecedence?.enum).toEqual(['user', 'signal', 'signals']);
  });

  it('flattens intersected objects into one object', () => {
    expect(experience).not.toHaveProperty('allOf');
    expect(experience.type).toBe('object');
    expect(experience.required).toEqual(['name']);
    expect(experience.properties).toHaveProperty('displayName');
    expect(experience.properties).toHaveProperty('regions');
  });

  it('collapses enums over 100 values to a string', () => {
    const subdivision = experience.properties?.regions?.items?.properties?.countrySubDivision;
    expect(subdivision?.type).toBe('string');
    expect(subdivision).not.toHaveProperty('enum');
    expect(subdivision?.description).toMatch(/^One of \d+ values/);
  });

  it('is small enough for a tool listing and has no $schema or $ref', () => {
    const json = JSON.stringify(schema);
    expect(json.length).toBeLessThan(20_000);
    expect(json).not.toMatch(/\$schema|\$ref/);
  });
});

describe('ymlRecordSchema and ymlItemsSchema', () => {
  it('advertise the codec properties in the tool input schema', () => {
    const input = z.object({
      one: ymlRecordSchema(ConsentManagerInput, 'Consent manager, same as the yaml section.'),
      many: ymlItemsSchema('Sites to write.', { codec: ConsentSiteInput, max: 5 }),
    });
    const json = toolInputSchema(input) as {
      properties: { one: Node; many: Node & { maxItems: number } };
    };

    expect(json.properties.one.description).toBe('Consent manager, same as the yaml section.');
    expect(json.properties.one.properties).toHaveProperty('reportOnly');
    expect(json.properties.many.maxItems).toBe(5);
    expect(json.properties.many.items?.properties).toHaveProperty('host');
  });

  it('still accepts any object in zod, since the codec validates in the handler', () => {
    const schema = ymlRecordSchema(ConsentManagerInput, 'Consent manager, same as the yaml.');
    expect(schema.safeParse({ unknownKey: 1 }).success).toBe(true);
  });

  it('pass the defineTool description audit', () => {
    expect(() =>
      defineTool({
        name: 'test_write',
        description: 'Test tool.',
        category: 'Test',
        readOnly: false,
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
        zodSchema: z.object({
          item: ymlRecordSchema(ConsentManagerInput, 'Consent manager, same as the yaml.'),
          items: ymlItemsSchema('Sites to write.', { codec: ConsentSiteInput }),
        }),
        handler: async () => ({}),
      }),
    ).not.toThrow();
  });
});
