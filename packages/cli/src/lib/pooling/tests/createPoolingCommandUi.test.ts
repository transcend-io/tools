import * as readline from 'node:readline';

import type { WorkerLogPaths } from '@transcend-io/utils';
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
    expect(mocks.dashboardPlugin).toHaveBeenCalledWith(input, plugin, false, {
      stdout: context.process.stdout,
      cursorTo: readline.cursorTo,
      clearScreenDown: readline.clearScreenDown,
    });

    const repaint = vi.fn();
    const setPaused = vi.fn();
    const getLogPaths = vi.fn();
    const workers = new Map<number, never>();
    const onCtrlC = vi.fn();
    const replayWhich: ('out' | 'err')[] = ['out'];
    ui.installInteractiveSwitcher?.({
      workers,
      onCtrlC,
      getLogPaths,
      replayBytes: 1024,
      replayWhich,
      repaint,
      setPaused,
    });

    const switcherOptions = mocks.installInteractiveSwitcher.mock.calls[0]?.[0];
    expect(switcherOptions).toEqual(
      expect.objectContaining({
        workers,
        onCtrlC,
        getLogPaths,
        replayBytes: 1024,
        replayWhich,
        ports: expect.objectContaining({
          stdin: context.process.stdin,
          stdout: context.process.stdout,
          stderr: context.process.stderr,
          emitKeypressEvents: readline.emitKeypressEvents,
        }),
      }),
    );

    switcherOptions?.onAttach?.(1);
    switcherOptions?.onDetach?.();
    switcherOptions?.onEnterAttachScreen?.(7);
    expect(setPaused).toHaveBeenNthCalledWith(1, true);
    expect(setPaused).toHaveBeenNthCalledWith(2, false);
    expect(setPaused).toHaveBeenNthCalledWith(3, true);
    expect(repaint).toHaveBeenCalledOnce();
    expect(context.stdout).toContain('Attached to worker 7.');

    const logsBySlot = new Map<number, WorkerLogPaths | undefined>();
    ui.extraKeyHandler?.({
      logsBySlot,
      repaint,
      setPaused,
    });
    expect(mocks.createExtraKeyHandler).toHaveBeenCalledWith({
      logsBySlot,
      repaint,
      setPaused,
      stdout: context.process.stdout,
    });
  });

  it('omits the interactive switcher in viewer mode', () => {
    const context = buildContextForTest();

    expect(
      createPoolingCommandUi(context, plugin, true).installInteractiveSwitcher,
    ).toBeUndefined();
  });
});
