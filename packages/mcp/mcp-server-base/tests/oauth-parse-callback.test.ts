import { describe, expect, it } from 'vitest';

import {
  OAuthCallbackError,
  parseOAuthCallbackQuery,
  validateOAuthCallbackQuery,
} from '../src/oauth/parse-callback.js';

describe('parseOAuthCallbackQuery', () => {
  it('extracts code, state, and error parameters', () => {
    expect(
      parseOAuthCallbackQuery(
        '/callback?code=abc&state=xyz&error=access_denied&error_description=User%20denied',
      ),
    ).toEqual({
      code: 'abc',
      state: 'xyz',
      error: 'access_denied',
      errorDescription: 'User denied',
    });
  });
});

describe('validateOAuthCallbackQuery', () => {
  it('returns the authorization code when state matches', () => {
    const result = validateOAuthCallbackQuery({ code: 'auth-code', state: 'expected' }, 'expected');
    expect(result).toEqual({ code: 'auth-code', state: 'expected' });
  });

  it('rejects OAuth error responses from the authorization server', () => {
    expect(() =>
      validateOAuthCallbackQuery(
        { error: 'access_denied', errorDescription: 'User denied' },
        'expected',
      ),
    ).toThrow(OAuthCallbackError);
  });

  it('rejects callbacks without an authorization code', () => {
    expect(() => validateOAuthCallbackQuery({ state: 'expected' }, 'expected')).toThrow(
      /missing authorization code/i,
    );
  });

  it('rejects callbacks with a state mismatch', () => {
    expect(() =>
      validateOAuthCallbackQuery({ code: 'auth-code', state: 'wrong' }, 'expected'),
    ).toThrow(/state mismatch/i);
  });
});
