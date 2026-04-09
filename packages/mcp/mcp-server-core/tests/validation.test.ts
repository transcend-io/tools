import { describe, it, expect } from 'vitest';

import { validateArgs, z } from '../src/validation/index.js';

describe('validateArgs', () => {
  it('valid input returns { success: true, data } with parsed values', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });
    const result = validateArgs(schema, { name: 'Alice', age: 30 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: 'Alice', age: 30 });
    }
  });

  it('missing required field returns { success: false } with helpful error message', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });
    const result = validateArgs(schema, { name: 'Alice' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('object');
      const err = result.error as { error?: string };
      expect(err.error).toContain('Invalid input');
      expect(err.error).toMatch(/age|required/i);
    }
  });

  it('wrong type (string instead of number) returns validation error', () => {
    const schema = z.object({
      count: z.number(),
    });
    const result = validateArgs(schema, { count: 'not-a-number' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error as { error?: string };
      expect(err.error).toContain('Invalid input');
      expect(err.error).toMatch(/count|number/i);
    }
  });

  it('extra fields are stripped (default Zod behavior)', () => {
    const schema = z.object({
      name: z.string(),
    });
    const result = validateArgs(schema, { name: 'Bob', extra: 'ignored', foo: 123 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: 'Bob' });
      expect(result.data).not.toHaveProperty('extra');
      expect(result.data).not.toHaveProperty('foo');
    }
  });

  it('optional fields can be omitted', () => {
    const schema = z.object({
      required: z.string(),
      optional: z.string().optional(),
    });
    const result = validateArgs(schema, { required: 'value' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ required: 'value' });
      expect(result.data.optional).toBeUndefined();
    }
  });

  it('z.coerce.number() converts string "50" to number 50', () => {
    const schema = z.object({
      limit: z.coerce.number(),
    });
    const result = validateArgs(schema, { limit: '50' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(50);
      expect(typeof result.data.limit).toBe('number');
    }
  });

  it('nested object validation works', () => {
    const schema = z.object({
      user: z.object({
        name: z.string(),
        address: z.object({
          city: z.string(),
          zip: z.string(),
        }),
      }),
    });
    const result = validateArgs(schema, {
      user: {
        name: 'Charlie',
        address: { city: 'NYC', zip: '10001' },
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.user.name).toBe('Charlie');
      expect(result.data.user.address.city).toBe('NYC');
      expect(result.data.user.address.zip).toBe('10001');
    }
  });

  it('array validation works', () => {
    const schema = z.object({
      ids: z.array(z.string()),
    });
    const result = validateArgs(schema, { ids: ['a', 'b', 'c'] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ids).toEqual(['a', 'b', 'c']);
    }
  });
});
