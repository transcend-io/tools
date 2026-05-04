import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type Logger, SimpleLogger } from '../src/clients/graphql/base.js';

type StreamSpy = ReturnType<typeof vi.spyOn<NodeJS.WriteStream, 'write'>>;

describe('SimpleLogger', () => {
  let stdoutSpy: StreamSpy;
  let stderrSpy: StreamSpy;
  let originalLogLevel: string | undefined;

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    SimpleLogger.setInfoToStdout(false);
    originalLogLevel = process.env.LOG_LEVEL;
    delete process.env.LOG_LEVEL;
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    SimpleLogger.setInfoToStdout(false);
    if (originalLogLevel === undefined) {
      delete process.env.LOG_LEVEL;
    } else {
      process.env.LOG_LEVEL = originalLogLevel;
    }
  });

  /**
   * Read the structured JSON written for a single log call from a stream spy.
   * Asserts exactly one write occurred so tests fail fast when routing is wrong.
   */
  function readSingleLogLine(spy: StreamSpy): Record<string, unknown> {
    expect(spy).toHaveBeenCalledOnce();
    const written = spy.mock.calls[0]?.[0] as string;
    expect(written.endsWith('\n')).toBe(true);
    return JSON.parse(written.trim()) as Record<string, unknown>;
  }

  describe('default mode (stdio-safe, all-stderr)', () => {
    it('routes info to stderr', () => {
      new SimpleLogger().info('hello', { foo: 1 });
      expect(stdoutSpy).not.toHaveBeenCalled();
      const parsed = readSingleLogLine(stderrSpy);
      expect(parsed).toMatchObject({ level: 'info', message: 'hello', data: { foo: 1 } });
    });

    it('routes warn to stderr', () => {
      new SimpleLogger().warn('something fishy');
      expect(stdoutSpy).not.toHaveBeenCalled();
      const parsed = readSingleLogLine(stderrSpy);
      expect(parsed.level).toBe('warn');
    });

    it('routes error to stderr', () => {
      new SimpleLogger().error('boom');
      expect(stdoutSpy).not.toHaveBeenCalled();
      const parsed = readSingleLogLine(stderrSpy);
      expect(parsed.level).toBe('error');
    });

    it('emits nothing for debug when LOG_LEVEL is unset', () => {
      new SimpleLogger().debug('shhh');
      expect(stdoutSpy).not.toHaveBeenCalled();
      expect(stderrSpy).not.toHaveBeenCalled();
    });

    it('routes debug to stderr when LOG_LEVEL=debug', () => {
      process.env.LOG_LEVEL = 'debug';
      new SimpleLogger().debug('deep');
      expect(stdoutSpy).not.toHaveBeenCalled();
      const parsed = readSingleLogLine(stderrSpy);
      expect(parsed.level).toBe('debug');
    });
  });

  describe('HTTP mode (setInfoToStdout(true))', () => {
    beforeEach(() => {
      SimpleLogger.setInfoToStdout(true);
    });

    it('routes info to stdout', () => {
      new SimpleLogger().info('hello');
      expect(stderrSpy).not.toHaveBeenCalled();
      const parsed = readSingleLogLine(stdoutSpy);
      expect(parsed.level).toBe('info');
    });

    it('routes debug to stdout when LOG_LEVEL=debug', () => {
      process.env.LOG_LEVEL = 'debug';
      new SimpleLogger().debug('deep');
      expect(stderrSpy).not.toHaveBeenCalled();
      const parsed = readSingleLogLine(stdoutSpy);
      expect(parsed.level).toBe('debug');
    });

    it('keeps warn on stderr', () => {
      new SimpleLogger().warn('hmm');
      expect(stdoutSpy).not.toHaveBeenCalled();
      const parsed = readSingleLogLine(stderrSpy);
      expect(parsed.level).toBe('warn');
    });

    it('keeps error on stderr', () => {
      new SimpleLogger().error('boom');
      expect(stdoutSpy).not.toHaveBeenCalled();
      const parsed = readSingleLogLine(stderrSpy);
      expect(parsed.level).toBe('error');
    });
  });

  describe('singleton config', () => {
    it('is shared across all SimpleLogger instances', () => {
      const a = new SimpleLogger();
      const b = new SimpleLogger();
      SimpleLogger.setInfoToStdout(true);
      a.info('from a');
      b.info('from b');
      expect(stdoutSpy).toHaveBeenCalledTimes(2);
      expect(stderrSpy).not.toHaveBeenCalled();
    });

    it('reverts to stderr when toggled back to false', () => {
      SimpleLogger.setInfoToStdout(true);
      const logger = new SimpleLogger();
      logger.info('http mode');
      SimpleLogger.setInfoToStdout(false);
      logger.info('stdio mode');
      expect(stdoutSpy).toHaveBeenCalledOnce();
      expect(stderrSpy).toHaveBeenCalledOnce();
    });
  });

  describe('JSON output shape', () => {
    it('emits a single newline-terminated valid JSON line per call', () => {
      new SimpleLogger().info('msg', { id: 42 });
      const written = stderrSpy.mock.calls[0]?.[0] as string;
      expect(written.endsWith('\n')).toBe(true);
      expect(written.split('\n').filter(Boolean)).toHaveLength(1);
      expect(() => JSON.parse(written.trim())).not.toThrow();
    });

    it('includes level, message, data, and ISO 8601 timestamp', () => {
      new SimpleLogger().info('hello', { id: 1 });
      const parsed = readSingleLogLine(stderrSpy);
      expect(parsed.level).toBe('info');
      expect(parsed.message).toBe('hello');
      expect(parsed.data).toEqual({ id: 1 });
      expect(parsed.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('omits the data field when no data argument is passed', () => {
      new SimpleLogger().info('just a message');
      const written = stderrSpy.mock.calls[0]?.[0] as string;
      const parsed = JSON.parse(written.trim()) as Record<string, unknown>;
      expect(parsed.data).toBeUndefined();
      expect('data' in parsed).toBe(false);
    });
  });

  describe('utils Logger compatibility', () => {
    it('is assignable to the variadic Logger interface', () => {
      const logger: Logger = new SimpleLogger();
      logger.info('hello', { foo: 1 });
      const parsed = readSingleLogLine(stderrSpy);
      expect(parsed.message).toBe('hello');
      expect(parsed.data).toEqual({ foo: 1 });
    });

    it('reflects only the first two args when called via the wide interface with extras', () => {
      // Calling through the wide Logger interface allows variadic args at the type level.
      // SimpleLogger's strict implementation only consumes the first two; extras are
      // silently ignored, matching standard JS function-call semantics.
      const logger: Logger = new SimpleLogger();
      logger.info('first', 'second', 'third');
      const parsed = readSingleLogLine(stderrSpy);
      expect(parsed.message).toBe('first');
      expect(parsed.data).toBe('second');
    });
  });
});
