import type { PreferenceQueryResponseItem } from '@transcend-io/privacy-types';
import { getPreferencesForIdentifiers } from '@transcend-io/sdk';
import type { Got } from 'got';
/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/no-unused-vars,require-await */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoisted shared spies / fakes
const H = vi.hoisted(() => ({
  loggerSpies: {
    info: vi.fn(),
    warn: vi.fn(),
  },
  // Capture map options for assertions
  mapOpts: { current: undefined as unknown },
  // Fake progress bar instance methods
  progressBar: {
    start: vi.fn(),
    update: vi.fn(),
    stop: vi.fn(),
  },
  // Decode result stub
  makeDecodeResult: (nodes: PreferenceQueryResponseItem[]) => ({ nodes }),
}));

/** Mock external deps BEFORE SUT import */
vi.mock('../../../logger.js', () => ({
  logger: H.loggerSpies,
}));

// Return a default export that has SingleBar and Presets
vi.mock('cli-progress', () => ({
  default: {
    SingleBar: vi.fn(function MockSingleBar() {
      return H.progressBar;
    }),
    Presets: { shades_classic: {} },
  },
}));

// Keep colors stable
vi.mock('colors', () => ({
  default: {
    yellow: (s: string) => s,
    green: (s: string) => s,
  },
  yellow: (s: string) => s,
  green: (s: string) => s,
}));

// Intercept bluebird.map to capture concurrency and still execute
vi.mock('@transcend-io/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@transcend-io/utils')>()),
  map: vi.fn(async (arr: unknown[], mapper: (x: unknown) => unknown, opts) => {
    H.mapOpts.current = opts;
    const results = [];
    for (const a of arr) {
      // run sequentially for determinism

      results.push(await mapper(a));
    }
    return results;
  }),
}));

// decodeCodec should just return what we expect to consume
vi.mock('@transcend-io/type-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@transcend-io/type-utils')>();
  return {
    ...actual,
    decodeCodec: vi.fn((_codec, raw) => raw),
  };
});

describe('getPreferencesForIdentifiers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it(
    'chunks identifiers into groups of 100, calls the API per group, ' +
      'aggregates nodes, and reports progress (skipLogging=true avoids start/info logs)',
    async () => {
      // Build 250 identifiers -> 3 groups: 100, 100, 50
      const identifiers = Array.from({ length: 250 }, (_, i) => ({
        value: `user-${i + 1}@ex.com`,
        name: 'email',
      }));

      // Fake Got client with post().json() chain that returns a result based on the requested group
      const postMock = vi.fn(
        (
          _url: string,
          {
            json,
          }: {
            /** JSON */
            json: {
              /** filter */
              filter: {
                /** identifiers */
                identifiers: {
                  /** Identifier value */
                  value: string;
                  /** Identifier name */
                  name: string;
                }[];
              };
            };
          },
        ) => {
          const group = json.filter.identifiers;
          // Return nodes based on the input group for easy assertions
          const nodes: PreferenceQueryResponseItem[] = group.map((g: any, idx: number) => ({
            partition: 'p0',
            consentManagement: {},
            purposes: [],
            timestamp: new Date(1700000000000 + idx).toISOString(),
            system: {
              updatedAt: new Date(1700000000000 + idx).toISOString(),
              decryptionStatus: 'DECRYPTED',
            },
          }));
          const raw = H.makeDecodeResult(nodes);
          return {
            json: async () => raw,
          };
        },
      );

      const sombra = { post: postMock } as unknown as Got;

      const out = await getPreferencesForIdentifiers(sombra, {
        identifiers,
        partitionKey: 'p0',
        skipLogging: true,
        concurrency: 7,
        logger: H.loggerSpies as any,
      });

      // Expect 3 calls (100 + 100 + 50)
      expect(postMock).toHaveBeenCalledTimes(3);

      // Validate each call's payload
      const call1Json = postMock.mock.calls[0][1].json;
      const call2Json = postMock.mock.calls[1][1].json;
      const call3Json = postMock.mock.calls[2][1].json;

      expect(call1Json.filter.identifiers).toHaveLength(100);
      expect(call1Json.filter.identifiers[0].value).toBe('user-1@ex.com');
      expect(call1Json.filter.identifiers[99].value).toBe('user-100@ex.com');

      expect(call2Json.filter.identifiers).toHaveLength(100);
      expect(call2Json.filter.identifiers[0].value).toBe('user-101@ex.com');
      expect(call2Json.filter.identifiers[99].value).toBe('user-200@ex.com');

      expect(call3Json.filter.identifiers).toHaveLength(50);
      expect(call3Json.filter.identifiers[0].value).toBe('user-201@ex.com');
      expect(call3Json.filter.identifiers[49].value).toBe('user-250@ex.com');

      // Decode/aggregate result length should be 250
      expect(out).toHaveLength(250);
      expect(out).toHaveLength(250);

      // Progress bar is not used by the current implementation.
      expect(H.progressBar.start).not.toHaveBeenCalled();
      expect(H.progressBar.update).not.toHaveBeenCalled();
      expect(H.progressBar.stop).not.toHaveBeenCalled();

      // Logger.info only at the end when !skipLogging, so not in this test
      expect(H.loggerSpies.info).not.toHaveBeenCalled();

      // Concurrency plumbing preserved
      // @ts-expect-error test-only capture
      expect(H.mapOpts.current?.concurrency).toBe(7);

      // withPreferenceRetry is used internally by the SDK — verified via sombra.post calls
      expect(sombra.post).toHaveBeenCalledTimes(3);
    },
  );

  it('logs progress start and completion when skipLogging=false', async () => {
    const identifiers = Array.from({ length: 5 }, (_, i) => ({
      value: `u${i + 1}`,
      name: 'test-id',
    }));

    const postMock = vi.fn(
      (
        _url: string,
        {
          json,
        }: {
          /** JSON */
          json: {
            /** Filter */
            filter: {
              /** Identifier values */
              identifiers: {
                /** Identifier value */
                value: string;
                /** Identifier name */
                name: string;
              }[];
            };
          };
        },
      ) => {
        const nodes: PreferenceQueryResponseItem[] = json.filter.identifiers.map((g: any) => ({
          timestamp: new Date().toISOString(),
          system: {
            updatedAt: new Date().toISOString(),
            decryptionStatus: 'DECRYPTED',
          },
          partition: 'pA',
          consentManagement: {},
          purposes: [],
        }));
        const raw = H.makeDecodeResult(nodes);
        return {
          json: async () => raw,
        };
      },
    );

    const sombra = { post: postMock } as unknown as Got;
    const out = await getPreferencesForIdentifiers(sombra, {
      identifiers,
      partitionKey: 'pA',
      skipLogging: false,
      concurrency: 2,
      logger: H.loggerSpies as any,
    });

    expect(out).toHaveLength(5);
    expect(H.progressBar.start).not.toHaveBeenCalled();
    expect(H.progressBar.stop).not.toHaveBeenCalled();

    // Completion info log called once
    expect(H.loggerSpies.info).toHaveBeenCalledTimes(1);
    expect(String(H.loggerSpies.info.mock.calls[0][0])).toContain('Completed download in');
  });
});
/* eslint-enable @typescript-eslint/no-explicit-any,@typescript-eslint/no-unused-vars,require-await */
