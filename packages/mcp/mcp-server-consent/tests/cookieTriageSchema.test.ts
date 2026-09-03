import { toJsonSchemaCompat } from '@modelcontextprotocol/sdk/server/zod-json-schema-compat.js';
import { describe, expect, it } from 'vitest';

import { CookieTriageAppSchema } from '../src/tools/cookie_triage_app.js';

describe('CookieTriageAppSchema JSON schema', () => {
  it('exposes triageType enum for MCP hosts', () => {
    const schema = toJsonSchemaCompat(CookieTriageAppSchema as never) as {
      properties: {
        triageType: { type?: string; enum?: string[] };
      };
      required?: string[];
    };

    expect(schema.required).toEqual(['triageType']);
    expect(schema.properties.triageType.enum).toEqual(['cookies', 'data_flows']);
  });

  it('accepts cookies and data_flows', () => {
    expect(CookieTriageAppSchema.safeParse({ triageType: 'cookies' }).success).toBe(true);
    expect(CookieTriageAppSchema.safeParse({ triageType: 'data_flows' }).success).toBe(true);
    expect(CookieTriageAppSchema.safeParse({ triageType: 'both' }).success).toBe(false);
    expect(CookieTriageAppSchema.safeParse({}).success).toBe(false);
  });
});
