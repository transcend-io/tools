import { toJsonSchemaCompat } from '@modelcontextprotocol/sdk/server/zod-json-schema-compat.js';
import { describe, expect, it } from 'vitest';

import { toolInputSchema } from '../src/tools/input-schema.js';
import { z } from '../src/validation/index.js';

/** Shared object with an id so zod extracts it into draft-7 `definitions`. */
const SharedId = z.object({ id: z.string() }).meta({ id: 'SharedId' });

const fixtureSchema = z.object({
  pair: z.tuple([z.string(), z.number()]),
  left: SharedId,
  right: SharedId,
});

describe('toolInputSchema', () => {
  it('omits the $schema dialect pointer', () => {
    const schema = toolInputSchema(fixtureSchema);
    expect(schema).not.toHaveProperty('$schema');
  });

  it('emits draft-7 shapes for tuples and reused definitions', () => {
    const schema = toolInputSchema(fixtureSchema) as {
      properties: {
        pair: { items?: unknown; prefixItems?: unknown };
        left: { $ref?: string };
        right: { $ref?: string };
      };
      definitions?: Record<string, unknown>;
      $defs?: unknown;
    };

    expect(schema.properties.pair.items).toEqual([{ type: 'string' }, { type: 'number' }]);
    expect(schema.properties.pair).not.toHaveProperty('prefixItems');
    expect(schema.definitions?.SharedId).toEqual({
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    });
    expect(schema).not.toHaveProperty('$defs');
    expect(schema.properties.left.$ref).toBe('#/definitions/SharedId');
    expect(schema.properties.right.$ref).toBe('#/definitions/SharedId');
  });

  it('matches the SDK toJsonSchemaCompat wire shape (minus $schema)', () => {
    const { $schema: _dialect, ...compat } = toJsonSchemaCompat(fixtureSchema as never) as Record<
      string,
      unknown
    >;
    expect(toolInputSchema(fixtureSchema)).toEqual(compat);
  });
});
