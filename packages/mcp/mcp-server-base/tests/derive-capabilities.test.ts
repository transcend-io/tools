import type { ClientCapabilities } from '@modelcontextprotocol/sdk/types.js';
import { describe, expect, it } from 'vitest';

import { deriveClientCapabilities, describeCapabilities } from '../src/capabilities/derive.js';
import {
  MCP_APP_MIME_TYPE,
  MCP_UI_EXTENSION_ID,
  McpClientCapability,
  McpHostClient,
} from '../src/capabilities/types.js';

describe('deriveClientCapabilities', () => {
  it('detects nothing for a client that declares nothing', () => {
    const report = deriveClientCapabilities({ capabilities: {} });
    expect([...report.capabilities]).toEqual([]);
    expect(report.host).toBe(McpHostClient.Unknown);
  });

  it('detects nothing when there are no capabilities at all', () => {
    const report = deriveClientCapabilities({});
    expect([...report.capabilities]).toEqual([]);
  });

  it('detects form elicitation', () => {
    const report = deriveClientCapabilities({ capabilities: { elicitation: { form: {} } } });
    expect(report.capabilities.has(McpClientCapability.Elicitation)).toBe(true);
    expect(report.capabilities.has(McpClientCapability.ElicitationUrl)).toBe(false);
  });

  it('detects url elicitation independently of form elicitation', () => {
    const report = deriveClientCapabilities({ capabilities: { elicitation: { url: {} } } });
    expect(report.capabilities.has(McpClientCapability.ElicitationUrl)).toBe(true);
    expect(report.capabilities.has(McpClientCapability.Elicitation)).toBe(false);
  });

  it('treats a bare elicitation object as form support', () => {
    // The SDK's schema preprocesses `elicitation: {}` into `{ form: {} }`, so a
    // client declaring it that way must not be read as declaring nothing.
    const capabilities = { elicitation: {} } as unknown as ClientCapabilities;
    const report = deriveClientCapabilities({ capabilities });
    expect(report.capabilities.has(McpClientCapability.Elicitation)).toBe(true);
  });

  it('detects MCP Apps when the extension declares the HTML profile', () => {
    const report = deriveClientCapabilities({
      capabilities: {
        extensions: { [MCP_UI_EXTENSION_ID]: { mimeTypes: [MCP_APP_MIME_TYPE] } },
      },
    });
    expect(report.capabilities.has(McpClientCapability.McpApp)).toBe(true);
  });

  it('detects MCP Apps when the extension omits mimeTypes', () => {
    const report = deriveClientCapabilities({
      capabilities: { extensions: { [MCP_UI_EXTENSION_ID]: {} } },
    });
    expect(report.capabilities.has(McpClientCapability.McpApp)).toBe(true);
  });

  it('does not detect MCP Apps when the host only supports other mime types', () => {
    const report = deriveClientCapabilities({
      capabilities: {
        extensions: { [MCP_UI_EXTENSION_ID]: { mimeTypes: ['application/vnd.future+json'] } },
      },
    });
    expect(report.capabilities.has(McpClientCapability.McpApp)).toBe(false);
  });

  it('does not detect MCP Apps from an unrelated extension', () => {
    const report = deriveClientCapabilities({
      capabilities: { extensions: { 'com.example/other': {} } },
    });
    expect(report.capabilities.has(McpClientCapability.McpApp)).toBe(false);
  });

  it('combines elicitation and MCP Apps', () => {
    const report = deriveClientCapabilities({
      capabilities: {
        elicitation: { form: {} },
        extensions: { [MCP_UI_EXTENSION_ID]: { mimeTypes: [MCP_APP_MIME_TYPE] } },
      },
    });
    expect(describeCapabilities(report)).toEqual([
      McpClientCapability.Elicitation,
      McpClientCapability.McpApp,
    ]);
  });

  it('identifies the host and retains clientInfo for logging', () => {
    const report = deriveClientCapabilities({
      capabilities: {},
      clientInfo: { name: 'claude-ai', version: '1.2.3' },
    });
    expect(report.host).toBe(McpHostClient.Claude);
    expect(report.clientInfo).toEqual({ name: 'claude-ai', version: '1.2.3' });
  });

  it('falls back to the caller header when clientInfo is unrecognized', () => {
    const report = deriveClientCapabilities({
      clientInfo: { name: 'some-internal-proxy', version: '0.0.1' },
      callerHeader: 'cursor',
    });
    expect(report.host).toBe(McpHostClient.Cursor);
  });
});
