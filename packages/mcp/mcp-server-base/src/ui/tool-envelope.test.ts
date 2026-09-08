import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { describe, expect, it } from 'vitest';

import { parseToolEnvelope } from './tool-envelope.js';

/** Builds the shape our servers actually send: the envelope as JSON text. */
function textResult(payload: unknown, isError?: boolean): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload) }],
    ...(isError !== undefined && { isError }),
  };
}

describe('parseToolEnvelope', () => {
  it('unwraps a successful envelope from the first text block', () => {
    const result = parseToolEnvelope<{ greeting: string }>(
      textResult({ success: true, data: { greeting: 'hello' }, timestamp: '2026-01-01' }),
    );

    expect(result).toEqual({ data: { greeting: 'hello' }, error: undefined });
  });

  it('reports the error message from an unsuccessful envelope', () => {
    const result = parseToolEnvelope(textResult({ success: false, error: 'No such silo' }, true));

    expect(result).toEqual({ data: undefined, error: 'No such silo' });
  });

  it('falls back to a generic message when a failure carries no error text', () => {
    const result = parseToolEnvelope(textResult({ success: false }));

    expect(result).toEqual({ data: undefined, error: 'Tool call failed' });
  });

  it('treats isError as failure even when the envelope claims success', () => {
    const result = parseToolEnvelope(textResult({ success: true, data: { partial: true } }, true));

    expect(result).toEqual({ data: undefined, error: 'Tool call failed' });
  });

  it('prefers structuredContent over the text block', () => {
    const result = parseToolEnvelope<{ from: string }>({
      content: [{ type: 'text', text: JSON.stringify({ success: true, data: { from: 'text' } }) }],
      structuredContent: { success: true, data: { from: 'structured' } },
    });

    expect(result).toEqual({ data: { from: 'structured' }, error: undefined });
  });

  it('treats structuredContent without a success flag as the payload itself', () => {
    const result = parseToolEnvelope<{ total: number }>({
      content: [],
      structuredContent: { total: 7 },
    });

    expect(result).toEqual({ data: { total: 7 }, error: undefined });
  });

  it('surfaces prose from a tool that does not return JSON', () => {
    const result = parseToolEnvelope<string>({
      content: [{ type: 'text', text: 'Everything looks fine.' }],
    });

    expect(result).toEqual({ data: 'Everything looks fine.', error: undefined });
  });

  it('reports a failure when prose comes back with isError set', () => {
    const result = parseToolEnvelope({
      content: [{ type: 'text', text: 'Something broke.' }],
      isError: true,
    });

    expect(result).toEqual({ data: undefined, error: 'Tool call failed' });
  });

  it('returns nothing when the result carries no text content', () => {
    const result = parseToolEnvelope({
      content: [{ type: 'image', data: '', mimeType: 'image/png' }],
    });

    expect(result).toEqual({ data: undefined, error: undefined });
  });

  it('returns nothing when the JSON payload is not an object', () => {
    const result = parseToolEnvelope(textResult(42));

    expect(result).toEqual({ data: undefined, error: undefined });
  });
});
