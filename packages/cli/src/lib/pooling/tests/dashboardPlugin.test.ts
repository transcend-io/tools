import type { ObjByString } from '@transcend-io/type-utils';
import { describe, it, expect, vi } from 'vitest';

import type { CommonCtx, DashboardPorts } from '../dashboardPlugin.js';

/**
 * Mock `colors` so that `colors.dim` returns the raw string (no ANSI codes).
 */
vi.mock('colors', () => ({
  default: { dim: (s: string): string => s },
  dim: (s: string): string => s,
}));

/**
 * Load the SUT module fresh to reset internal state (e.g., lastFrame cache).
 */
type SutModule = typeof import('../dashboardPlugin.js');

/**
 * Import the SUT fresh to reset internal module state (e.g., lastFrame cache).
 *
 * @returns a newly imported SUT module
 */
function loadSutFresh(): Promise<SutModule> {
  vi.resetModules();
  return import('../dashboardPlugin.js');
}

/**
 * Build injected terminal operations and their call records.
 *
 * @returns Injected ports and recorded terminal output.
 */
function makePorts(): {
  /** Terminal ports passed to the dashboard. */
  ports: DashboardPorts;
  /** Recorded stdout payloads. */
  writes: string[];
  /** Cursor positioning spy. */
  cursorTo: ReturnType<typeof vi.fn>;
  /** Screen-clearing spy. */
  clearScreenDown: ReturnType<typeof vi.fn>;
} {
  const writes: string[] = [];
  const stdout = {
    write: vi.fn((chunk) => {
      writes.push(String(chunk));
      return true;
    }),
  } as unknown as NodeJS.WriteStream;
  const cursorTo = vi.fn();
  const clearScreenDown = vi.fn();
  return {
    ports: {
      stdout,
      cursorTo,
      clearScreenDown,
    },
    writes,
    cursorTo,
    clearScreenDown,
  };
}

/**
 * Minimal context factory for dashboardPlugin. Worker state is an empty Map —
 * sufficient for these UI-only tests and type-safe via a narrow assertion.
 *
 * @param overrides - partial overrides for defaults
 * @returns a complete ctx object suitable for dashboardPlugin
 */
function makeCtx(
  overrides: Partial<CommonCtx<ObjByString, ObjByString>> = {},
): Parameters<SutModule['dashboardPlugin']>[0] {
  const base = {
    title: 'Test Dashboard',
    poolSize: 3,
    cpuCount: 8,
    filesTotal: 10,
    filesCompleted: 2,
    filesFailed: 1,
    workerState: new Map<number, never>() as unknown as Map<number, never>,
    totals: {},
    throughput: {
      successSoFar: 2,
      r10s: 1.23,
      r60s: 0.9,
      jobsR10s: 0,
      jobsR60s: 0,
    },
    final: false,
    exportStatus: { path: '/tmp/out' },
  };
  return { ...base, ...overrides } as Parameters<SutModule['dashboardPlugin']>[0];
}

/**
 * A simple plugin for assertions; all methods return deterministic content.
 *
 * @returns a plugin object with renderHeader, renderWorkers, and renderExtras methods
 */
function makePlugin(): Parameters<SutModule['dashboardPlugin']>[1] {
  const plugin: Parameters<SutModule['dashboardPlugin']>[1] = {
    renderHeader: (ctx): string[] => [
      `=== ${ctx.title} ===`,
      `${ctx.filesCompleted}/${ctx.filesTotal} completed • failed=${ctx.filesFailed}`,
    ],
    renderWorkers: (ctx): string[] => [`workers: ${ctx.poolSize} • cpu=${ctx.cpuCount}`],
    renderExtras: (ctx): string[] => [`export: ${JSON.stringify(ctx.exportStatus)}`],
  };
  return plugin;
}

describe('hotkeysHint', () => {
  it('formats live hint for a single worker (digit range [0])', async () => {
    const { hotkeysHint } = await loadSutFresh();
    const s = hotkeysHint(1, false);
    expect(s).toBe(
      'Hotkeys: [0] attach • e=errors • w=warnings • i=info • l=logs • Tab/Shift+Tab • Esc/Ctrl+] detach • Ctrl+C exit',
    );
  });

  it('formats live hint with a digit range and ≥10 hint when poolSize > 10', async () => {
    const { hotkeysHint } = await loadSutFresh();
    const s = hotkeysHint(11, false);
    expect(s).toBe(
      'Hotkeys: [0-9] attach (Tab/Shift+Tab for ≥10) • e=errors • w=warnings • ' +
        'i=info • l=logs • Tab/Shift+Tab • Esc/Ctrl+] detach • Ctrl+C exit',
    );
  });

  it('formats final-state hint (no hotkey list)', async () => {
    const { hotkeysHint } = await loadSutFresh();
    const s = hotkeysHint(4, true);
    expect(s).toBe(
      'Run complete — digits to view logs • Tab/Shift+Tab cycle • Esc/Ctrl+] detach • q to quit',
    );
  });
});

describe('dashboardPlugin', () => {
  it('composes a full frame, hides cursor, and repaints in-place during live updates', async () => {
    const sut = await loadSutFresh();
    const ctx = makeCtx({ title: 'Uploader', poolSize: 2 });
    const plugin = makePlugin();
    const terminal = makePorts();

    sut.dashboardPlugin(ctx, plugin, false, terminal.ports);

    // Cursor hidden, then frame written
    const { writes } = terminal;
    expect(writes[0]).toBe('\x1b[?25l');

    // Readline called to position + clear screen prior to painting frame
    expect(terminal.cursorTo).toHaveBeenCalledWith(terminal.ports.stdout, 0, 0);
    expect(terminal.clearScreenDown).toHaveBeenCalledWith(terminal.ports.stdout);

    // The final write should be the composed frame + trailing newline.
    const expectedFrame = [
      ...plugin.renderHeader(ctx),
      '',
      ...plugin.renderWorkers(ctx),
      '',
      sut.hotkeysHint(ctx.poolSize, ctx.final),
      '',
      ...(plugin.renderExtras ? plugin.renderExtras(ctx) : []),
    ].join('\n');

    expect(writes.at(-1)).toBe(`${expectedFrame}\n`);
  });

  it('suppresses duplicate frames while live (no second repaint)', async () => {
    const sut = await loadSutFresh();
    const ctx = makeCtx();
    const plugin = makePlugin();
    const terminal = makePorts();

    sut.dashboardPlugin(ctx, plugin, false, terminal.ports); // initial paint
    const countAfterFirst = terminal.writes.length;

    sut.dashboardPlugin(ctx, plugin, false, terminal.ports); // identical frame
    const countAfterSecond = terminal.writes.length;

    expect(countAfterSecond).toBe(countAfterFirst); // no extra writes
    expect(terminal.cursorTo).toHaveBeenCalledTimes(1);
    expect(terminal.clearScreenDown).toHaveBeenCalledTimes(1);
  });

  it('renders an identical live frame to a different output stream', async () => {
    const sut = await loadSutFresh();
    const ctx = makeCtx();
    const plugin = makePlugin();
    const firstTerminal = makePorts();
    const secondTerminal = makePorts();

    sut.dashboardPlugin(ctx, plugin, false, firstTerminal.ports);
    sut.dashboardPlugin(ctx, plugin, false, secondTerminal.ports);

    expect(firstTerminal.writes).not.toHaveLength(0);
    expect(secondTerminal.writes).not.toHaveLength(0);
  });

  it('always writes final frame and restores cursor, even if identical to last', async () => {
    const sut = await loadSutFresh();
    const ctxLive = makeCtx({ final: false });
    const ctxFinal = { ...ctxLive, final: true } as typeof ctxLive;
    const plugin = makePlugin();
    const liveTerminal = makePorts();

    // Seed lastFrame with the same content by doing a live render first
    sut.dashboardPlugin(ctxLive, plugin, false, liveTerminal.ports);

    const finalTerminal = makePorts();
    sut.dashboardPlugin(ctxFinal, plugin, false, finalTerminal.ports);

    const { writes } = finalTerminal;
    // On final, we do NOT move the cursor or clear the screen
    expect(finalTerminal.cursorTo).not.toHaveBeenCalled();
    expect(finalTerminal.clearScreenDown).not.toHaveBeenCalled();

    // Final render restores cursor then writes the frame
    expect(writes[0]).toBe('\x1b[?25h');

    const expectedFrame = [
      ...plugin.renderHeader(ctxFinal),
      '',
      ...plugin.renderWorkers(ctxFinal),
      '',
      sut.hotkeysHint(ctxFinal.poolSize, ctxFinal.final),
      '',
      ...(plugin.renderExtras ? plugin.renderExtras(ctxFinal) : []),
    ].join('\n');
    expect(writes.at(-1)).toBe(`${expectedFrame}\n`);
  });

  it('omits extras section entirely when plugin.renderExtras is not provided', async () => {
    const sut = await loadSutFresh();
    const ctx = makeCtx();
    const terminal = makePorts();
    const pluginNoExtras: Parameters<SutModule['dashboardPlugin']>[1] = {
      renderHeader: (c): string[] => [`H:${c.title}`],
      renderWorkers: (c): string[] => [`W:${c.poolSize}`],
      // No renderExtras
    };

    sut.dashboardPlugin(ctx, pluginNoExtras, false, terminal.ports);
    const { writes } = terminal;

    const expected = [
      ...pluginNoExtras.renderHeader(ctx),
      '',
      ...pluginNoExtras.renderWorkers(ctx),
      '',
      sut.hotkeysHint(ctx.poolSize, ctx.final),
      // No trailing '' or extras in this case
    ].join('\n');

    expect(writes.at(-1)).toBe(`${expected}\n`);
  });
});
