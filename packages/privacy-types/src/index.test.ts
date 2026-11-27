import { describe, expect, it } from 'vitest';

import {
  DefaultDataSubCategoryType,
  DefaultPurposeSubCategoryType,
  LocaleCodec,
  PrivacyCenterAccessTokenFormat,
  McpToolErrorCode,
  RequestAction,
  TranscendMcpServer,
} from './index.js';

describe('@transcend-io/privacy-types', () => {
  it('exports seven stable MCP tool error codes', () => {
    expect(Object.values(McpToolErrorCode)).toHaveLength(7);
    expect(McpToolErrorCode.PermissionError).toBe('PERMISSION_ERROR');
  });

  it('exports twelve domain MCP server identifiers', () => {
    expect(Object.values(TranscendMcpServer)).toHaveLength(12);
    expect(TranscendMcpServer.Config).toBe('config');
    expect(TranscendMcpServer.PrivacyCenter).toBe('privacyCenter');
  });

  it('exports ACCESS as a request action', () => {
    expect(Object.values(RequestAction)).toContain('ACCESS');
  });

  it('exports EMAIL as a data subcategory', () => {
    expect(Object.values(DefaultDataSubCategoryType)).toContain('EMAIL');
  });

  it('exports APPROXIMATE_LOCATION as a data subcategory', () => {
    expect(Object.values(DefaultDataSubCategoryType)).toContain('APPROXIMATE_LOCATION');
  });

  it('exports ESSENTIAL as a purpose subcategory', () => {
    expect(Object.values(DefaultPurposeSubCategoryType)).toContain('ESSENTIAL');
  });

  it('exports JWT and SHORT access token formats', () => {
    expect(Object.values(PrivacyCenterAccessTokenFormat)).toEqual(['JWT', 'SHORT']);
  });

  it('exports the shared locale codec', () => {
    expect(LocaleCodec.name).toBe('Locale');
    expect(LocaleCodec.is('en')).toBe(true);
    expect(LocaleCodec.is('not-a-locale')).toBe(false);
  });
});
