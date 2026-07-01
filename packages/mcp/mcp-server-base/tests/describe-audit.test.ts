import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  collectMissingDescriptions,
  MIN_DESCRIPTION_LENGTH,
} from '../src/validation/describe-audit.js';

const GOOD = 'A sufficiently descriptive sentence.';

describe('collectMissingDescriptions', () => {
  it('returns [] when every top-level field is described', () => {
    const schema = z.object({
      name: z.string().describe(GOOD),
      count: z.number().describe(GOOD),
    });
    expect(collectMissingDescriptions(schema)).toEqual([]);
  });

  it('flags fields with no description', () => {
    const schema = z.object({
      described: z.string().describe(GOOD),
      bare: z.string(),
    });
    expect(collectMissingDescriptions(schema)).toEqual(['bare']);
  });

  it(`flags descriptions shorter than ${MIN_DESCRIPTION_LENGTH} chars`, () => {
    const schema = z.object({
      tooShort: z.string().describe('id'),
    });
    expect(collectMissingDescriptions(schema)).toEqual(['tooShort']);
  });

  it('reads descriptions through wrapper layers in either author order', () => {
    const schema = z.object({
      // .describe() before the wrapper
      optionalFirst: z.string().describe(GOOD).optional(),
      // .describe() after the wrapper
      optionalLast: z.string().optional().describe(GOOD),
      withDefault: z.string().default('x').describe(GOOD),
      nullable: z.string().nullable().describe(GOOD),
    });
    expect(collectMissingDescriptions(schema)).toEqual([]);
  });

  it('recurses into nested objects and reports dotted paths', () => {
    const schema = z.object({
      filterBy: z
        .object({
          status: z.string().describe(GOOD),
          bare: z.string(),
        })
        .describe(GOOD),
    });
    expect(collectMissingDescriptions(schema)).toEqual(['filterBy.bare']);
  });

  it('flags a nested object field even when the parent is described', () => {
    const schema = z.object({
      // parent lacks a description AND a child lacks one
      filterBy: z.object({
        bare: z.string(),
      }),
    });
    expect(collectMissingDescriptions(schema)).toEqual(['filterBy', 'filterBy.bare']);
  });

  it('recurses into array-of-object elements with a [] path segment', () => {
    const schema = z.object({
      answers: z
        .array(
          z.object({
            value: z.string().describe(GOOD),
            isUserCreated: z.boolean(),
          }),
        )
        .describe(GOOD),
    });
    expect(collectMissingDescriptions(schema)).toEqual(['answers[].isUserCreated']);
  });

  it('does not require descriptions on array-of-primitive elements', () => {
    const schema = z.object({
      ids: z.array(z.string()).describe(GOOD),
    });
    expect(collectMissingDescriptions(schema)).toEqual([]);
  });

  it('recurses into record values with a {} path segment', () => {
    const schema = z.object({
      metadata: z
        .record(
          z.string(),
          z.object({
            label: z.string(),
          }),
        )
        .describe(GOOD),
    });
    expect(collectMissingDescriptions(schema)).toEqual(['metadata{}.label']);
  });

  it('unwraps a refined (ZodEffects) root schema', () => {
    const schema = z
      .object({
        bare: z.string(),
      })
      .refine(() => true, 'always valid');
    expect(collectMissingDescriptions(schema)).toEqual(['bare']);
  });

  it('returns [] for an empty object (no fields to audit)', () => {
    expect(collectMissingDescriptions(z.object({}))).toEqual([]);
  });

  it('returns [] for a non-object root it cannot introspect', () => {
    expect(collectMissingDescriptions(z.string())).toEqual([]);
  });
});
