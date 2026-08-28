import { toJsonSchemaCompat } from '@modelcontextprotocol/sdk/server/zod-json-schema-compat.js';
import { describe, expect, it } from 'vitest';

import { CookieTriageAppSchema } from '../src/tools/cookie_triage_app.js';

describe('CookieTriageAppSchema JSON schema', () => {
  it('exposes a flat cookies array with lastActivityAt for MCP hosts', () => {
    const schema = toJsonSchemaCompat(CookieTriageAppSchema as never) as {
      properties: {
        cookies: { items: { properties: Record<string, unknown> } };
      };
    };

    expect(schema.properties.cookies.items.properties.lastActivityAt).toBeDefined();
    expect(schema.properties.cookies.items.properties.trackingPurposes).toBeDefined();
  });
});
