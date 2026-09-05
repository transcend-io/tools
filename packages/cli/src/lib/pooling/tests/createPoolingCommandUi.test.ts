import { describe, expect, it, vi } from 'vitest';

import { buildContextForTest } from '../../tests/helpers/buildContextForTest.js';
import { createPoolingCommandUi } from '../createPoolingCommandUi.js';
import type { DashboardPlugin } from '../dashboardPlugin.js';

const mocks = vi.hoisted(() => ({
  dashboardPlugin: vi.fn<typeof import('../dashboardPlugin.js').dashboardPlugin>(),
  installInteractiveSwitcher: vi.fn<
    typeof import('../installInteractiveSwitcher.js').installInteractiveSwitcher
  >(() => vi.fn()),
  createExtraKeyHandler: vi.fn<typeof import('../createExtraKeyHandler.js').createExtraKeyHandler>(
    () => vi.fn(),
  ),
}));

vi.mock('../dashboardPlugin.js', async () => ({
  ...(await vi.importActual<typeof import('../dashboardPlugin.js')>('../dashboardPlugin.js')),
  dashboardPlugin: mocks.dashboardPlugin,
}));

vi.mock('../installInteractiveSwitcher.js', () => ({
  installInteractiveSwitcher: mocks.installInteractiveSwitcher,
}));

vi.mock('../createExtraKeyHandler.js', () => ({
  createExtraKeyHandler: mocks.createExtraKeyHandler,
}));

const plugin: DashboardPlugin<Record<string, never>, Record<string, never>> = {
  renderHeader: () => [],
  renderWorkers: () => [],
};

describe('createPoolingCommandUi', () => {
  it('binds pool callbacks to the command streams', () => {
    const context = buildContextForTest();
    const ui = createPoolingCommandUi(context, plugin, false);
    const input = { title: 'Pool' };

    ui.render(input as never);
    expect(mocks.dashboardPlugin).toHaveBeenCalledWith(
      input,
      plugin,
      false,
      expect.objectContaining({ stdout: context.process.stdout }),
    );

    const repaint = vi.fn();
    const setPaused = vi.fn();
    const getLogPaths = vi.fn();
    ui.installInteractiveSwitcher?.({
      workers: new Map(),
      onCtrlC: vi.fn(),
      getLogPaths,
      replayBytes: 1024,
      replayWhich: ['out'],
      repaint,
      setPaused,
    });

    const switcherOptions = mocks.installInteractiveSwitcher.mock.calls[0]?.[0];
    expect(switcherOptions?.ports).toEqual(
      expect.objectContaining({
        stdin: context.process.stdin,
        stdout: context.process.stdout,
        stderr: context.process.stderr,
      }),
    );

    switcherOptions?.onAttach?.(1);
    switcherOptions?.onDetach?.();
    expect(setPaused).toHaveBeenNthCalledWith(1, true);
    expect(setPaused).toHaveBeenNthCalledWith(2, false);
    expect(repaint).toHaveBeenCalledOnce();

    ui.extraKeyHandler?.({
      logsBySlot: new Map(),
      repaint,
      setPaused,
    });
    expect(mocks.createExtraKeyHandler).toHaveBeenCalledWith(
      expect.objectContaining({ stdout: context.process.stdout }),
    );
  });

  it('omits the interactive switcher in viewer mode', () => {
    const context = buildContextForTest();

    expect(
      createPoolingCommandUi(context, plugin, true).installInteractiveSwitcher,
    ).toBeUndefined();
  });
});
