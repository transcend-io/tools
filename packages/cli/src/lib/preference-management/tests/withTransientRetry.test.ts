import { withTransientRetry, RETRY_TRANSIENT_MSGS, isTransientError } from '@transcend-io/sdk';
/* eslint-disable require-await */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const H = vi.hoisted(() => ({
  loggerSpies: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  sleepSpy: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../logger.js', () => ({
  logger: H.loggerSpies,
}));

vi.mock('@transcend-io/utils', () => ({
  sleepPromise: H.sleepSpy,
  extractErrorMessage: (err: unknown) =>
    err instanceof Error ? err.message : String(err ?? 'Unknown error'),
}));

vi.mock('colors', () => ({
  default: {
    yellow: (s: string) => s,
  },
  yellow: (s: string) => s,
}));

describe('withTransientRetry', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    H.loggerSpies.warn.mockClear();
    H.sleepSpy.mockClear();
  });

  it('returns immediately on first success (no retries)', async () => {
    const fn = vi.fn(async (): Promise<string> => 'ok');

    const out = await withTransientRetry('op', fn, { logger: H.loggerSpies });
    expect(out).toEqual('ok');

    expect(fn).toHaveBeenCalledTimes(1);
    expect(H.loggerSpies.warn).not.toHaveBeenCalled();
    expect(H.sleepSpy).not.toHaveBeenCalled();
  });

  it('retries on a retryable error and then succeeds; logs and sleeps with backoff+jitter', async () => {
    const retryMsg = RETRY_TRANSIENT_MSGS[0];
    const fn = vi.fn().mockRejectedValueOnce(new Error(retryMsg)).mockResolvedValueOnce('ok-2');

    const onRetry = vi.fn();
    const out = await withTransientRetry('op', fn, {
      logger: H.loggerSpies,
      baseDelayMs: 200,
      onRetry,
    });

    expect(out).toEqual('ok-2');
    expect(fn).toHaveBeenCalledTimes(2);

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry.mock.calls[0][0]).toBe(1);
    expect(String(onRetry.mock.calls[0][2])).toContain(retryMsg);

    expect(H.loggerSpies.warn).toHaveBeenCalledTimes(1);
    expect(H.sleepSpy).toHaveBeenCalledWith(300);
  });

  it('retries on a got-style HTTPError by statusCode even when message is generic', async () => {
    // Simulate `got`'s HTTPError shape: the message is generic but the
    // response object carries the transient status code.
    const httpError = Object.assign(new Error('Response code 502 (Bad Gateway)'), {
      response: { statusCode: 502, statusMessage: 'Bad Gateway' },
    });
    const fn = vi.fn().mockRejectedValueOnce(httpError).mockResolvedValueOnce('ok-status');

    const out = await withTransientRetry('op', fn, {
      logger: H.loggerSpies,
      baseDelayMs: 100,
    });
    expect(out).toEqual('ok-status');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('stops retrying and throws if error is non-retryable', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Something fatal'));

    await expect(
      withTransientRetry('op', fn, {
        logger: H.loggerSpies,
        maxAttempts: 5,
      }),
    ).rejects.toThrow('op failed after 1 attempt(s):');

    expect(fn).toHaveBeenCalledTimes(1);
    expect(H.loggerSpies.warn).not.toHaveBeenCalled();
    expect(H.sleepSpy).not.toHaveBeenCalled();
  });

  it('does not retry on a 4xx HTTPError (client error)', async () => {
    const httpError = Object.assign(new Error('Bad request'), {
      response: { statusCode: 400, statusMessage: 'Bad Request' },
    });
    const fn = vi.fn().mockRejectedValue(httpError);

    await expect(
      withTransientRetry('op', fn, { logger: H.loggerSpies, maxAttempts: 4 }),
    ).rejects.toThrow('op failed after 1 attempt(s):');

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('exhausts maxAttempts on retryable error and then throws', async () => {
    const retryMsg = RETRY_TRANSIENT_MSGS[1];
    const fn = vi.fn().mockRejectedValue(new Error(retryMsg));

    await expect(
      withTransientRetry('op', fn, {
        logger: H.loggerSpies,
        maxAttempts: 3,
        baseDelayMs: 100,
      }),
    ).rejects.toThrow('op failed after 3 attempt(s):');

    expect(fn).toHaveBeenCalledTimes(3);
    expect(H.sleepSpy).toHaveBeenCalledTimes(2);

    expect(H.sleepSpy.mock.calls[0][0]).toBe(150);
    expect(H.sleepSpy.mock.calls[1][0]).toBe(250);
  });

  it('defaults to 12 maxAttempts when not specified', async () => {
    const retryMsg = RETRY_TRANSIENT_MSGS[0];
    const fn = vi.fn().mockRejectedValue(new Error(retryMsg));

    await expect(
      withTransientRetry('op', fn, {
        logger: H.loggerSpies,
        baseDelayMs: 10,
      }),
    ).rejects.toThrow('op failed after 12 attempt(s):');

    expect(fn).toHaveBeenCalledTimes(12);
    expect(H.sleepSpy).toHaveBeenCalledTimes(11);
  });

  it('honors custom isRetryable predicate', async () => {
    let calls = 0;
    const fn = vi.fn(async () => {
      calls += 1;
      if (calls < 2) throw new Error('custom-transient-edge');
      return 'ok-custom';
    });

    const out = await withTransientRetry('op', fn, {
      logger: H.loggerSpies,
      isRetryable: (_err, msg) => msg.includes('custom-transient'),
      baseDelayMs: 10,
    });

    expect(out).toEqual('ok-custom');
    expect(fn).toHaveBeenCalledTimes(2);
    expect(H.sleepSpy).toHaveBeenCalledTimes(1);
  });
});

describe('isTransientError', () => {
  it.each([
    ['ENOTFOUND api.transcend.io'],
    ['ECONNRESET'],
    ['ETIMEDOUT while reading'],
    ['Response code 502 (Bad Gateway)'],
    ['504 Gateway Time-out'],
    ['429 Too Many Requests'],
  ])('matches transient message substring: %s', (msg) => {
    expect(isTransientError(new Error(msg), msg)).toBe(true);
  });

  it('does not match unrelated client error messages', () => {
    expect(isTransientError(new Error('syntax error'), 'syntax error')).toBe(false);
    expect(isTransientError(new Error('forbidden'), 'forbidden')).toBe(false);
  });

  it.each([[500], [502], [503], [504], [429], [408]])(
    'matches transient status code %i',
    (statusCode) => {
      const err = Object.assign(new Error('x'), { response: { statusCode } });
      expect(isTransientError(err, 'x')).toBe(true);
    },
  );

  it.each([[400], [401], [403], [404], [409], [422]])(
    'does not match non-transient status code %i',
    (statusCode) => {
      const err = Object.assign(new Error('x'), { response: { statusCode } });
      expect(isTransientError(err, 'x')).toBe(false);
    },
  );
});
/* eslint-enable require-await */
