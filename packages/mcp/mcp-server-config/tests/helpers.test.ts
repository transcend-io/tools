import {
  configureOAuthScopes,
  ErrorCode,
  resetConfiguredOAuthScopes,
  ToolError,
  TranscendGraphQLBase,
} from '@transcend-io/mcp-server-base';
import { ScopeName } from '@transcend-io/privacy-types';
import {
  TR_PULL_RESOURCE_SCOPE_MAP,
  TranscendPullResource,
  type TranscendInput,
} from '@transcend-io/sdk/transcend-yml';
import { afterEach, describe, expect, it } from 'vitest';

import { assertScopesAvailable } from '../src/helpers/assertScopesAvailable.js';
import { createCollectedLogger } from '../src/helpers/collectingLogger.js';
import { assertConfigFilePath } from '../src/helpers/configFilePath.js';
import {
  countConfigSections,
  resourcesInInput,
  scopesForResources,
  stripEmptyConfigSections,
} from '../src/helpers/sections.js';
import { CONFIG_OAUTH_SCOPES } from '../src/scopes.js';

describe('assertConfigFilePath', () => {
  it('accepts absolute yaml paths', () => {
    expect(assertConfigFilePath('/tmp/a/transcend.yml')).toBe('/tmp/a/transcend.yml');
    expect(assertConfigFilePath('/tmp/a/transcend.YAML')).toBe('/tmp/a/transcend.YAML');
  });

  it('rejects relative paths', () => {
    expect(() => assertConfigFilePath('transcend.yml')).toThrow(/absolute/);
  });

  it('rejects other extensions', () => {
    expect(() => assertConfigFilePath('/etc/passwd')).toThrow(/\.yml or \.yaml/);
    expect(() => assertConfigFilePath('/tmp/a.json')).toThrow(ToolError);
  });
});

describe('sections', () => {
  const input = {
    'data-silos': [{ title: 'a' }, { title: 'b' }],
    enrichers: [],
    'action-items': [],
  } as unknown as TranscendInput;

  it('drops empty sections', () => {
    expect(Object.keys(stripEmptyConfigSections(input))).toEqual(['data-silos']);
  });

  it('counts items per non-empty section', () => {
    expect(countConfigSections(input)).toEqual({ 'data-silos': 2 });
  });

  it('maps present sections back to resources', () => {
    expect(resourcesInInput(input)).toEqual([TranscendPullResource.DataSilos]);
  });

  it('unions and sorts scopes for resources', () => {
    const scopes = scopesForResources(
      [TranscendPullResource.DataSilos, TranscendPullResource.ApiKeys],
      TR_PULL_RESOURCE_SCOPE_MAP,
    );
    expect(scopes).toContain(ScopeName.ViewApiKeys);
    expect(new Set(scopes).size).toBe(scopes.length);
    expect(scopes).toEqual([...scopes].sort());
  });
});

describe('CONFIG_OAUTH_SCOPES', () => {
  it('covers the scopes for every pull resource', () => {
    for (const scopes of Object.values(TR_PULL_RESOURCE_SCOPE_MAP)) {
      for (const scope of scopes) expect(CONFIG_OAUTH_SCOPES).toContain(scope);
    }
  });
});

describe('createCollectedLogger', () => {
  it('keeps info, warn and error lines and drops debug', () => {
    const { logger, logs } = createCollectedLogger();
    logger.debug('skip');
    logger.info('a', { b: 1 });
    logger.warn('w');
    logger.error('e');
    expect(logs).toEqual([
      { level: 'info', message: 'a {"b":1}' },
      { level: 'warn', message: 'w' },
      { level: 'error', message: 'e' },
    ]);
  });

  it('caps the number of lines', () => {
    const { logger, logs } = createCollectedLogger();
    for (let i = 0; i < 500; i += 1) logger.info(`line ${i}`);
    expect(logs).toHaveLength(200);
  });
});

describe('assertScopesAvailable', () => {
  afterEach(() => resetConfiguredOAuthScopes());

  const oauth = new TranscendGraphQLBase({ type: 'oauthToken', accessToken: 't' });
  const apiKey = new TranscendGraphQLBase({ type: 'apiKey', apiKey: 'k' });

  it('lists scopes that sign-in did not request', () => {
    configureOAuthScopes([ScopeName.ViewApiKeys]);

    let caught: unknown;
    try {
      assertScopesAvailable(oauth, [ScopeName.ViewApiKeys, ScopeName.ManageDataMap]);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ToolError);
    expect((caught as ToolError).code).toBe(ErrorCode.PERMISSION_ERROR);
    expect((caught as ToolError).details).toEqual({ missingScopes: [ScopeName.ManageDataMap] });
  });

  it('passes when every scope was requested', () => {
    configureOAuthScopes([ScopeName.ViewApiKeys]);
    expect(() => assertScopesAvailable(oauth, [ScopeName.ViewApiKeys])).not.toThrow();
  });

  it('skips the check for API keys', () => {
    configureOAuthScopes([]);
    expect(() => assertScopesAvailable(apiKey, [ScopeName.ManageDataMap])).not.toThrow();
  });

  it('skips the check when OAuth scopes are not configured', () => {
    expect(() => assertScopesAvailable(oauth, [ScopeName.ManageDataMap])).not.toThrow();
  });
});
