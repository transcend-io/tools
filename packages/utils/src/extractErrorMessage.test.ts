import { describe, it, expect } from 'vitest';

import { extractErrorMessage } from './extractErrorMessage.js';

describe('extractErrorMessage', () => {
  it('returns "Unknown error" when given undefined', () => {
    expect(extractErrorMessage(undefined)).to.equal('Unknown error');
  });

  it('returns err.message when no response.body is present', () => {
    const err = new Error('simple failure');
    expect(extractErrorMessage(err)).to.equal('simple failure');
  });

  it('prefers response.body over err.message when both exist (non-JSON body, no status code)', () => {
    const err = {
      message: 'fallback message',
      response: { body: 'raw server text' },
    };
    expect(extractErrorMessage(err)).to.equal('raw server text');
  });

  it('parses JSON body with error.message', () => {
    const err = {
      response: {
        body: JSON.stringify({ error: { message: 'Bad request' } }),
      },
    };
    expect(extractErrorMessage(err)).to.equal('Bad request');
  });

  it('parses JSON body with top-level errors as strings', () => {
    const err = {
      response: {
        body: JSON.stringify({ errors: ['First issue', 'Second issue'] }),
      },
    };
    expect(extractErrorMessage(err)).to.equal('First issue, Second issue');
  });

  it('parses JSON body with error.errors as strings', () => {
    const err = {
      response: {
        body: JSON.stringify({
          error: { errors: ['Rate limited', 'Try later'] },
        }),
      },
    };
    expect(extractErrorMessage(err)).to.equal('Rate limited, Try later');
  });

  it('filters falsy items when joining errors array', () => {
    const err = {
      response: {
        body: JSON.stringify({ errors: ['One', '', null, undefined, 'Two'] }),
      },
    };
    expect(extractErrorMessage(err)).to.equal('One, Two');
  });

  it('leaves non-JSON response bodies as-is when no status code is available', () => {
    const err = {
      response: {
        body: '<html>Internal Error</html>',
      },
    };
    expect(extractErrorMessage(err)).to.equal('<html>Internal Error</html>');
  });

  it('summarises HTML gateway bodies to "HTTP <code> <reason>" when status code is present', () => {
    const err = {
      message: 'Response code 502 (Bad Gateway)',
      response: {
        statusCode: 502,
        statusMessage: 'Bad Gateway',
        body: '<html><body>502 Bad Gateway</body></html>',
      },
    };
    expect(extractErrorMessage(err)).to.equal('HTTP 502 Bad Gateway');
  });

  it('falls back to the STATUS_REASONS lookup when statusMessage is missing', () => {
    const err = {
      response: {
        statusCode: 504,
        body: '<html>gateway timeout</html>',
      },
    };
    expect(extractErrorMessage(err)).to.equal('HTTP 504 Gateway Timeout');
  });

  it('truncates very long raw bodies when no status code is available', () => {
    const body = 'x'.repeat(500);
    const err = { response: { body } };
    const result = extractErrorMessage(err);
    expect(result.endsWith('... (truncated)')).to.equal(true);
    expect(result.length).to.be.lessThan(body.length);
  });

  it('documents current behavior for errors as array of objects (joins as [object Object])', () => {
    const err = {
      response: {
        body: JSON.stringify({
          errors: [{ message: 'Alpha' }, { message: 'Beta' }],
        }),
      },
    };
    expect(extractErrorMessage(err)).to.equal('[object Object], [object Object]');
  });
});
