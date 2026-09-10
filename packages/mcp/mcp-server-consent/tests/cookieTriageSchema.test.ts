import { toJsonSchemaCompat } from '@modelcontextprotocol/sdk/server/zod-json-schema-compat.js';
import { describe, expect, it } from 'vitest';

import { ConsentTriageType } from '../src/lib/cookieTriageTypes.js';
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
    expect(schema.properties.triageType.enum).toEqual([
      ConsentTriageType.Cookies,
      ConsentTriageType.DataFlows,
    ]);
  });

  it('accepts cookies and data_flows', () => {
    expect(CookieTriageAppSchema.safeParse({ triageType: ConsentTriageType.Cookies }).success).toBe(
      true,
    );
    expect(
      CookieTriageAppSchema.safeParse({ triageType: ConsentTriageType.DataFlows }).success,
    ).toBe(true);
    expect(CookieTriageAppSchema.safeParse({ triageType: 'both' }).success).toBe(false);
    expect(CookieTriageAppSchema.safeParse({}).success).toBe(false);
  });
});
