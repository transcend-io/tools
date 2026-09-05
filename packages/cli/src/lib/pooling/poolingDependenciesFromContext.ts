import type { ChildProcess } from 'node:child_process';
import * as readline from 'node:readline';

import type { ObjByString } from '@transcend-io/type-utils';
import type { SlotPaths, WorkerLogPaths } from '@transcend-io/utils';

import type { LocalContext } from '../../context.js';
import { createExtraKeyHandler, type CreateExtraKeyHandlerPorts } from './createExtraKeyHandler.js';
import {
  dashboardPlugin,
  type CommonCtx,
  type DashboardPlugin,
  type DashboardPorts,
} from './dashboardPlugin.js';
import { installInteractiveSwitcher, type SwitcherPorts } from './installInteractiveSwitcher.js';

/**
 * Complete dependency objects consumed by pooling UI helpers.
 */
export interface PoolingDependencies {
  /** Terminal and clock operations used by the dashboard renderer. */
  dashboardPorts: DashboardPorts;
  /** Stdio, readline, and filesystem operations used by the worker switcher. */
  switcherPorts: SwitcherPorts;
  /** Filesystem, output, and clock operations used by extra key handlers. */
  extraKeyHandlerPorts: CreateExtraKeyHandlerPorts;
}

/**
 * Interactive switcher arguments supplied by the pool runner.
 */
export interface PoolingSwitcherArgs {
  /** Map of worker slot IDs to child processes. */
  workers: Map<number, ChildProcess>;
  /** Trigger graceful parent shutdown. */
  onCtrlC: () => void;
  /** Resolve log paths for a worker slot. */
  getLogPaths: (id: number) => WorkerLogPaths | undefined;
  /** Number of tail bytes to replay. */
  replayBytes: number;
  /** Log streams to replay on attachment. */
  replayWhich: ('out' | 'err')[];
  /** Pause or resume dashboard rendering. */
  setPaused: (paused: boolean) => void;
  /** Trigger an immediate dashboard repaint. */
  repaint: () => void;
}

/**
 * Extra key handler arguments supplied by the pool runner.
 */
export interface PoolingExtraKeyHandlerArgs {
  /** Per-slot worker log paths. */
  logsBySlot: SlotPaths;
  /** Trigger an immediate dashboard repaint. */
  repaint: () => void;
  /** Pause or resume dashboard rendering. */
  setPaused: (paused: boolean) => void;
}

/**
 * Shared command closures for the pooling dashboard.
 */
export interface PoolingCommandUiBindings<TTotals, TSlotState extends ObjByString> {
  /** Render a pool dashboard frame. */
  render: (input: CommonCtx<TTotals, TSlotState>) => void;
  /** Install interactive worker attachment controls when enabled. */
  installInteractiveSwitcher?: (args: PoolingSwitcherArgs) => () => void;
  /** Create combined-log viewer key bindings. */
  extraKeyHandler: (args: PoolingExtraKeyHandlerArgs) => (buf: Buffer) => void;
}

/**
 * Bind pooling UI dependencies to a command's local runtime context.
 *
 * Readline and clock operations are owned here because they are not part of
 * {@link LocalContext}; process streams and filesystem methods always come
 * from the supplied context.
 *
 * @param context - Narrow command context containing process and filesystem dependencies.
 * @returns Complete port objects for pooling UI helpers.
 */
export function poolingDependenciesFromContext(
  context: Pick<LocalContext, 'process' | 'fs'>,
): PoolingDependencies {
  const { fs, process } = context;

  return {
    dashboardPorts: {
      stdout: process.stdout,
      cursorTo: readline.cursorTo,
      clearScreenDown: readline.clearScreenDown,
      now: Date.now,
    },
    switcherPorts: {
      stdin: process.stdin,
      stdout: process.stdout,
      stderr: process.stderr,
      emitKeypressEvents: readline.emitKeypressEvents,
      replayFileTailToStdoutDependencies: {
        createReadStream: fs.createReadStream,
        statSync: fs.statSync,
      },
    },
    extraKeyHandlerPorts: {
      readFile: (path) => fs.readFileSync(path, 'utf8'),
      stdout: process.stdout,
      now: Date.now,
    },
  };
}

/**
 * Bind the common pooling UI closures used by CLI commands.
 *
 * @param context - Narrow command context containing process and filesystem dependencies.
 * @param plugin - Command-specific dashboard renderer.
 * @param viewerMode - Whether interactive worker attachment is disabled.
 * @returns Pool runner callbacks bound to the command context.
 */
export function createPoolingCommandUi<TTotals, TSlotState extends ObjByString>(
  context: Pick<LocalContext, 'process' | 'fs'>,
  plugin: DashboardPlugin<TTotals, TSlotState>,
  viewerMode: boolean,
): PoolingCommandUiBindings<TTotals, TSlotState> {
  const { dashboardPorts, switcherPorts, extraKeyHandlerPorts } =
    poolingDependenciesFromContext(context);

  return {
    render: (input) => dashboardPlugin(input, plugin, viewerMode, dashboardPorts),
    installInteractiveSwitcher: viewerMode
      ? undefined
      : ({ workers, onCtrlC, getLogPaths, replayBytes, replayWhich, setPaused, repaint }) =>
          installInteractiveSwitcher({
            workers,
            onCtrlC,
            getLogPaths,
            replayBytes,
            replayWhich,
            ports: switcherPorts,
            onAttach: () => setPaused(true),
            onDetach: () => {
              setPaused(false);
              repaint();
            },
            onEnterAttachScreen: (id) => {
              setPaused(true);
              context.process.stdout.write('\x1b[2J\x1b[H');
              context.process.stdout.write(
                `Attached to worker ${id}. (Esc/Ctrl+] detach \u2022 Ctrl+D EOF \u2022 Ctrl+C SIGINT)\n`,
              );
            },
          }),
    extraKeyHandler: ({ logsBySlot, repaint, setPaused }) =>
      createExtraKeyHandler({
        logsBySlot,
        repaint,
        setPaused,
        ports: extraKeyHandlerPorts,
      }),
  };
}
