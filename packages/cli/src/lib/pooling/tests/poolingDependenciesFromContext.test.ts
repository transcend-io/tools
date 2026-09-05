import type { ChildProcess } from 'node:child_process';
import * as readline from 'node:readline';

import type { WorkerLogPaths } from '@transcend-io/utils';
import { describe, expect, it, vi } from 'vitest';

import { buildContextForTest } from '../../tests/helpers/buildContextForTest.js';
import { createExtraKeyHandler } from '../createExtraKeyHandler.js';
import { dashboardPlugin, type CommonCtx, type DashboardPlugin } from '../dashboardPlugin.js';
import { installInteractiveSwitcher } from '../installInteractiveSwitcher.js';
import {
  createPoolingCommandUi,
  poolingDependenciesFromContext,
} from '../poolingDependenciesFromContext.js';

const H = vi.hoisted(() => ({
  dashboardPlugin: vi.fn(),
  installInteractiveSwitcher: vi.fn(() => vi.fn()),
  createExtraKeyHandler: vi.fn(() => vi.fn()),
}));

vi.mock('../dashboardPlugin.js', async () => ({
  ...(await vi.importActual<typeof import('../dashboardPlugin.js')>('../dashboardPlugin.js')),
  dashboardPlugin: H.dashboardPlugin,
}));

vi.mock('../installInteractiveSwitcher.js', async () => ({
  ...(await vi.importActual<typeof import('../installInteractiveSwitcher.js')>(
    '../installInteractiveSwitcher.js',
  )),
  installInteractiveSwitcher: H.installInteractiveSwitcher,
}));

vi.mock('../createExtraKeyHandler.js', async () => ({
  ...(await vi.importActual<typeof import('../createExtraKeyHandler.js')>(
    '../createExtraKeyHandler.js',
  )),
  createExtraKeyHandler: H.createExtraKeyHandler,
}));

describe('poolingDependenciesFromContext', () => {
  it('binds context stdio and filesystem operations with helper-owned defaults', () => {
    const context = buildContextForTest();

    const dependencies = poolingDependenciesFromContext(context);

    expect(dependencies.dashboardPorts).toMatchObject({
      stdout: context.process.stdout,
      cursorTo: readline.cursorTo,
      clearScreenDown: readline.clearScreenDown,
      now: Date.now,
    });
    expect(dependencies.switcherPorts).toMatchObject({
      stdin: context.process.stdin,
      stdout: context.process.stdout,
      stderr: context.process.stderr,
      emitKeypressEvents: readline.emitKeypressEvents,
      replayFileTailToStdoutDependencies: {
        createReadStream: context.fs.createReadStream,
        statSync: context.fs.statSync,
      },
    });
    expect(dependencies.extraKeyHandlerPorts).toMatchObject({
      stdout: context.process.stdout,
      now: Date.now,
    });
    expect(dependencies.extraKeyHandlerPorts.readFile(import.meta.filename)).toContain(
      "describe('poolingDependenciesFromContext'",
    );
  });

  it('binds real command UI closures to context-derived ports', () => {
    const context = buildContextForTest();
    const plugin: DashboardPlugin<Record<string, never>, Record<string, never>> = {
      renderHeader: () => [],
      renderWorkers: () => [],
    };
    const bindings = createPoolingCommandUi(context, plugin, false);
    const input: CommonCtx<Record<string, never>, Record<string, never>> = {
      title: 'Pool',
      poolSize: 1,
      cpuCount: 1,
      filesTotal: 1,
      filesCompleted: 0,
      filesFailed: 0,
      workerState: new Map(),
      totals: {},
      throughput: {
        successSoFar: 0,
        r10s: 0,
        r60s: 0,
        jobsR10s: 0,
        jobsR60s: 0,
      },
      final: false,
    };

    bindings.render(input);

    const dashboard = vi.mocked(dashboardPlugin);
    expect(dashboard).toHaveBeenCalledWith(input, plugin, false, {
      stdout: context.process.stdout,
      cursorTo: readline.cursorTo,
      clearScreenDown: readline.clearScreenDown,
      now: Date.now,
    });

    const setPaused = vi.fn();
    const repaint = vi.fn();
    const switcherArgs = {
      workers: new Map<number, ChildProcess>(),
      onCtrlC: vi.fn(),
      getLogPaths: vi.fn(() => undefined),
      replayBytes: 1024,
      replayWhich: ['out', 'err'] as const,
      setPaused,
      repaint,
    };
    bindings.installInteractiveSwitcher?.({
      ...switcherArgs,
      replayWhich: [...switcherArgs.replayWhich],
    });

    const switcher = vi.mocked(installInteractiveSwitcher);
    const switcherOptions = switcher.mock.calls[0]?.[0];
    expect(switcherOptions).toMatchObject({
      workers: switcherArgs.workers,
      onCtrlC: switcherArgs.onCtrlC,
      getLogPaths: switcherArgs.getLogPaths,
      replayBytes: switcherArgs.replayBytes,
      replayWhich: switcherArgs.replayWhich,
      ports: {
        stdin: context.process.stdin,
        stdout: context.process.stdout,
        stderr: context.process.stderr,
        emitKeypressEvents: readline.emitKeypressEvents,
        replayFileTailToStdoutDependencies: {
          createReadStream: context.fs.createReadStream,
          statSync: context.fs.statSync,
        },
      },
    });

    switcherOptions?.onAttach?.(3);
    expect(setPaused).toHaveBeenLastCalledWith(true);
    switcherOptions?.onDetach?.();
    expect(setPaused).toHaveBeenLastCalledWith(false);
    expect(repaint).toHaveBeenCalled();
    switcherOptions?.onEnterAttachScreen?.(3);
    expect(context.stdout).toContain('Attached to worker 3');

    const extraArgs = {
      logsBySlot: new Map<number, WorkerLogPaths | undefined>(),
      repaint,
      setPaused,
    };
    bindings.extraKeyHandler(extraArgs);

    expect(vi.mocked(createExtraKeyHandler)).toHaveBeenCalledWith({
      ...extraArgs,
      ports: {
        readFile: expect.any(Function),
        stdout: context.process.stdout,
        now: Date.now,
      },
    });
    const extraPorts = vi.mocked(createExtraKeyHandler).mock.calls[0]?.[0].ports;
    expect(extraPorts?.readFile(import.meta.filename)).toContain(
      "describe('poolingDependenciesFromContext'",
    );
  });

  it('omits the switcher binding in viewer mode', () => {
    const context = buildContextForTest();
    const plugin: DashboardPlugin<Record<string, never>, Record<string, never>> = {
      renderHeader: () => [],
      renderWorkers: () => [],
    };

    expect(
      createPoolingCommandUi(context, plugin, true).installInteractiveSwitcher,
    ).toBeUndefined();
  });
});
