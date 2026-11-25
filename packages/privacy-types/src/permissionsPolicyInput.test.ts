import * as either from 'fp-ts/lib/Either.js';
import { describe, expect, it } from 'vitest';

import {
  PERMISSIONS_POLICY_INPUT_EXAMPLE,
  PermissionsPolicyInput,
  PermissionsPolicyPreferenceEntry,
  buildPermissionsPolicyInputJsonSchema,
} from './permissionsPolicyInput.js';

describe('PermissionsPolicyInput', () => {
  it('decodes the published schema example', () => {
    const result = PermissionsPolicyInput.decode(PERMISSIONS_POLICY_INPUT_EXAMPLE);

    expect(either.isRight(result)).toBe(true);
    if (either.isRight(result)) {
      expect(result.right).toEqual(PERMISSIONS_POLICY_INPUT_EXAMPLE);
    }
  });

  it('rejects negative days_since_choice', () => {
    const result = PermissionsPolicyPreferenceEntry.decode({
      name: 'Analytics',
      choice: true,
      days_since_choice: -1,
    });

    expect(either.isLeft(result)).toBe(true);
  });

  it('builds an OPA-friendly JSON Schema with the example', () => {
    const schema = buildPermissionsPolicyInputJsonSchema();

    expect(schema.$id).toContain('permissions-policy-input.json');
    expect(schema.required).toEqual(['preferences', 'context']);
    expect(schema.additionalProperties).toBe(false);
    expect(schema.properties.preferences).toMatchObject({
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'choice'],
        properties: {
          name: { type: 'string' },
          choice: { type: ['boolean', 'null'] },
          days_since_choice: { type: 'integer', minimum: 0 },
        },
      },
    });
    expect(schema.properties.context).toMatchObject({
      type: 'object',
      additionalProperties: true,
    });
    expect(schema.examples[0]).toEqual(PERMISSIONS_POLICY_INPUT_EXAMPLE);
  });
});
