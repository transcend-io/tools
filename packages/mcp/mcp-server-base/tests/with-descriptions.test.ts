import { describe, expect, test } from 'vitest';
import { z } from 'zod';

import { withDescriptions } from '../src/validation/with-descriptions.js';

describe('withDescriptions', () => {
  test('attaches the supplied descriptions to every field', () => {
    const Original = z.object({
      title: z.string(),
      count: z.number(),
    });
    const Wrapped = withDescriptions(Original, {
      title: 'Display title shown to the data subject.',
      count: 'How many records to return (1-100).',
    });

    expect(Wrapped.shape.title.description).toBe('Display title shown to the data subject.');
    expect(Wrapped.shape.count.description).toBe('How many records to return (1-100).');
  });

  test('preserves runtime validation for each field', () => {
    const Original = z.object({
      title: z.string().min(1),
      count: z.number().int().nonnegative(),
    });
    const Wrapped = withDescriptions(Original, {
      title: 'Required title.',
      count: 'Non-negative integer count.',
    });

    expect(() => Wrapped.parse({ title: 'ok', count: 0 })).not.toThrow();
    expect(() => Wrapped.parse({ title: '', count: 0 })).toThrow();
    expect(() => Wrapped.parse({ title: 'ok', count: -1 })).toThrow();
    expect(() => Wrapped.parse({ title: 'ok', count: 1.5 })).toThrow();
  });

  test('throws if any field is left without a description', () => {
    const Original = z.object({
      title: z.string(),
      count: z.number(),
    });
    expect(() =>
      withDescriptions(Original, {
        title: 'Display title.',
        // @ts-expect-error - intentionally missing description for `count`
        count: undefined,
      }),
    ).toThrow(/count/);
  });

  test('throws if any description is empty', () => {
    const Original = z.object({
      title: z.string(),
    });
    expect(() =>
      withDescriptions(Original, {
        title: '',
      }),
    ).toThrow(/title/);
  });
});
