import type { ExportStatusMap, SlotPaths } from '@transcend-io/utils';
/* eslint-disable max-lines */
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { CreateExtraKeyHandlerPorts } from '../createExtraKeyHandler.js';

/**
 * Mock the combined logs viewer. We assert calls and control resolution/rejection.
 */
const mShowCombinedLogs = vi.fn(() => Promise.resolve());
vi.mock('../showCombinedLogs.js', () => ({
  showCombinedLogs: mShowCombinedLogs,
}));

/**
 * Sub module
 */
type SutModule = typeof import('../createExtraKeyHandler.js');

/**
 * Import the SUT fresh.
 *
 * @returns Newly imported module.
 */
function loadSutFresh(): Promise<SutModule> {
  vi.resetModules();
  return import('../createExtraKeyHandler.js');
}

// --- Helpers -----------------------------------------------------------------

/**
 * Build an in-memory stdout port.
 *
 * @returns Injected stdout and its recorded payloads.
 */
function makeStdout(): {
  /** Standard output port passed to the handler. */
  stdout: CreateExtraKeyHandlerPorts['stdout'];
  /** Complete runtime ports passed to the handler. */
  ports: CreateExtraKeyHandlerPorts;
  /** Recorded write payloads. */
  writes: string[];
} {
  const writes: string[] = [];
  const stdout = {
    write: vi.fn((chunk) => {
      writes.push(String(chunk));
      return true;
    }),
  } as unknown as CreateExtraKeyHandlerPorts['stdout'];
  const ports: CreateExtraKeyHandlerPorts = {
    readFile: vi.fn(() => ''),
    stdout,
    now: Date.now,
  };
  return {
    stdout,
    ports,
    writes,
  };
}

/**
 * Minimal SlotPaths stub for tests. Only the identity matters for forwarding.
 *
 * @returns A SlotPaths-like object.
 */
function makeLogs(): SlotPaths {
  return { any: 'paths' } as unknown as SlotPaths;
}

/**
 * Create a fresh export status map.
 *
 * @returns A mutable ExportStatusMap-like object.
 */
function makeExportStatus(): ExportStatusMap {
  // The SUT only requires index access with { path, savedAt, exported }
  return {} as unknown as ExportStatusMap;
}

/**
 * Create spies for repaint/pause callbacks.
 *
 * @returns Functions used by the SUT and the underlying spies.
 */
function makeUiSpies(): {
  /** repaint function provided to SUT */
  repaint: () => void;
  /** setPaused function provided to SUT */
  setPaused: (p: boolean) => void;
  /** spy for repaint */
  repaintSpy: ReturnType<typeof vi.fn>;
  /** spy for setPaused */
  pausedSpy: ReturnType<typeof vi.fn>;
} {
  const repaintSpy = vi.fn(() => {
    // noop, just for spying
  });
  const pausedSpy = vi.fn(() => {
    // noop, just for spying
  });
  return { repaint: repaintSpy, setPaused: pausedSpy, repaintSpy, pausedSpy };
}

/**
 * Build a simple export manager stub whose method returns a deterministic path.
 *
 * @returns Export manager stub and its spy.
 */
function makeExportMgr(): {
  /** Destination directory for exported artifacts. */
  exportsDir: string;
  /** Method under test; returns path of written file. */
  exportCombinedLogs: (logs: SlotPaths, which: 'error' | 'warn' | 'info' | 'all') => string;
  /** Spy on exportCombinedLogs. */
  spy: ReturnType<typeof vi.fn>;
} {
  const spy = vi.fn(
    (_logs: SlotPaths, which: 'error' | 'warn' | 'info' | 'all') => `/exp/${which}.log`,
  );
  return { exportsDir: '/exp', exportCombinedLogs: spy, spy };
}

/**
 * Create a Buffer from a one-character string.
 *
 * @param s - A single-character string.
 * @returns A Buffer for the key.
 */
function key(s: string): Buffer {
  return Buffer.from(s, 'utf8');
}

describe('createExtraKeyHandler: viewers', () => {
  beforeEach(() => {
    mShowCombinedLogs.mockClear();
  });

  it('e / w / i / l trigger showCombinedLogs with correct sources/levels and pause the UI', async () => {
    const { createExtraKeyHandler } = await loadSutFresh();
    const logs = makeLogs();
    const { repaint, setPaused, repaintSpy, pausedSpy } = makeUiSpies();
    const { ports } = makeStdout();

    const handler = createExtraKeyHandler({
      logsBySlot: logs,
      repaint,
      setPaused,
      ports,
    });

    // e => ['err'], 'error'
    handler(key('e'));
    expect(mShowCombinedLogs).toHaveBeenCalledWith(logs, ['err'], 'error', ports);
    expect(pausedSpy).toHaveBeenCalledWith(true);

    // While viewing, another key should not stack a new viewer
    const callsAfterE = mShowCombinedLogs.mock.calls.length;
    handler(key('e'));
    expect(mShowCombinedLogs.mock.calls.length).toBe(callsAfterE);

    // Exit viewer with Esc, which resumes UI and repaints
    handler(key('\x1b'));
    expect(pausedSpy).toHaveBeenCalledWith(false);
    expect(repaintSpy).toHaveBeenCalled();

    // w => ['warn','err'], 'warn'
    handler(key('w'));
    expect(mShowCombinedLogs).toHaveBeenCalledWith(logs, ['warn', 'err'], 'warn', ports);

    // exit before opening another viewer
    handler(key('\x1b'));

    // i => ['info'], 'all'
    handler(key('i'));
    expect(mShowCombinedLogs).toHaveBeenCalledWith(logs, ['info'], 'all', ports);

    // exit before opening another viewer
    handler(key('\x1b'));

    // l => ['out','err','structured'], 'all'
    handler(key('l'));
    expect(mShowCombinedLogs).toHaveBeenCalledWith(
      logs,
      ['out', 'err', 'structured'],
      'all',
      ports,
    );
  });

  it('Ctrl+] also exits viewer and repaints', async () => {
    const { createExtraKeyHandler } = await loadSutFresh();
    const logs = makeLogs();
    const { repaint, setPaused, repaintSpy, pausedSpy } = makeUiSpies();
    const { ports } = makeStdout();
    const handler = createExtraKeyHandler({
      logsBySlot: logs,
      repaint,
      setPaused,
      ports,
    });

    handler(key('e')); // open viewer
    handler(Buffer.from('\x1d', 'utf8')); // Ctrl+]

    expect(pausedSpy).toHaveBeenCalledWith(false);
    expect(repaintSpy).toHaveBeenCalled();
  });

  it('on viewer error, unpauses and repaints (catch path)', async () => {
    const { createExtraKeyHandler } = await loadSutFresh();
    mShowCombinedLogs.mockRejectedValueOnce(new Error('boom'));

    const logs = makeLogs();
    const { repaint, setPaused, repaintSpy, pausedSpy } = makeUiSpies();
    const { ports } = makeStdout();
    const handler = createExtraKeyHandler({
      logsBySlot: logs,
      repaint,
      setPaused,
      ports,
    });

    handler(key('e'));
    // allow microtask queue to process the rejection handler
    await Promise.resolve();

    expect(pausedSpy).toHaveBeenCalledWith(true); // initially paused
    expect(pausedSpy).toHaveBeenCalledWith(false); // unpaused after error
    expect(repaintSpy).toHaveBeenCalled();
  });
});

describe('createExtraKeyHandler: exports', () => {
  beforeEach(() => {
    mShowCombinedLogs.mockClear();
  });

  it('E/W/I/A export combined logs, update exportStatus, and repaint when exportMgr present', async () => {
    const { createExtraKeyHandler } = await loadSutFresh();
    const logs = makeLogs();
    const exportStatus = makeExportStatus();
    const mgr = makeExportMgr();
    const { repaint, setPaused, repaintSpy } = makeUiSpies();
    const { ports } = makeStdout();
    const now = vi.fn(() => 1_735_689_600_000);

    const handler = createExtraKeyHandler({
      logsBySlot: logs,
      repaint,
      setPaused,
      exportMgr: mgr,
      exportStatus,
      ports: { ...ports, now },
    });

    const seq: Array<[string, 'error' | 'warn' | 'info' | 'all', string]> = [
      ['E', 'error', 'error'],
      ['W', 'warn', 'warn'],
      ['I', 'info', 'info'],
      ['A', 'all', 'ALL'],
    ];

    for (const [k, which] of seq) {
      handler(key(k));
      expect(mgr.spy).toHaveBeenLastCalledWith(logs, which);
      // exportStatus should be populated for the key
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cur = (exportStatus as any)[which];
      expect(cur).toMatchObject({
        exported: true,
        path: `/exp/${which}.log`,
        savedAt: 1_735_689_600_000,
      });
      expect(repaintSpy).toHaveBeenCalled();
    }
  });

  it('uppercase hotkeys are no-ops when exportMgr is absent', async () => {
    const { createExtraKeyHandler } = await loadSutFresh();
    const logs = makeLogs();
    const { repaint, setPaused, repaintSpy } = makeUiSpies();
    const terminal = makeStdout();

    const handler = createExtraKeyHandler({
      logsBySlot: logs,
      repaint,
      setPaused,
      ports: terminal.ports,
    });

    handler(key('E'));
    handler(key('W'));
    handler(key('I'));
    handler(key('A'));

    expect(repaintSpy).not.toHaveBeenCalled();
    expect(mShowCombinedLogs).not.toHaveBeenCalled();
    // No stdout messages about exports
    expect(terminal.writes.join('')).not.toMatch(/Wrote combined/);
  });
});

describe('createExtraKeyHandler: custom keys', () => {
  it('invokes custom handler with say and noteExport helpers', async () => {
    const { createExtraKeyHandler } = await loadSutFresh();
    const logs = makeLogs();
    const exportStatus = makeExportStatus();
    const { repaint, setPaused, repaintSpy } = makeUiSpies();
    const terminal = makeStdout();

    const handler = createExtraKeyHandler({
      logsBySlot: logs,
      repaint,
      setPaused,
      exportStatus,
      ports: { ...terminal.ports, now: () => 123 },
      custom: {
        F: ({ say, noteExport }): void => {
          say('Hello from custom');
          noteExport('info' as keyof ExportStatusMap, '/tmp/f.csv');
        },
      },
    });

    handler(key('F'));

    // Assert the side effects rather than fragile stdout text.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { info } = exportStatus as any;
    expect(info).toMatchObject({ path: '/tmp/f.csv', exported: true, savedAt: 123 });
    expect(terminal.writes).toContain('Hello from custom\n');
    expect(repaintSpy).toHaveBeenCalled();
  });
});
/* eslint-enable max-lines */
