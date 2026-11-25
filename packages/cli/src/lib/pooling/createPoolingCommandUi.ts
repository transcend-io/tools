import * as readline from 'node:readline';

import type { ObjByString } from '@transcend-io/type-utils';
import type { RunPoolOptions } from '@transcend-io/utils';

import type { LocalContext } from '../../context.js';
import { createExtraKeyHandler } from './createExtraKeyHandler.js';
import { dashboardPlugin, type DashboardPlugin } from './dashboardPlugin.js';
import { installInteractiveSwitcher } from './installInteractiveSwitcher.js';

type PoolingCommandUi<TTotals extends ObjByString, TSlotState extends ObjByString> = Pick<
  RunPoolOptions<ObjByString, TSlotState, ObjByString, TTotals>,
  'render' | 'installInteractiveSwitcher' | 'extraKeyHandler'
>;

/**
 * Bind the shared pooling UI to one command context.
 *
 * @param context - Command-owned streams.
 * @param plugin - Command-specific dashboard renderer.
 * @param viewerMode - Whether interactive worker attachment is disabled.
 * @returns Pool runner callbacks using the command context.
 */
export function createPoolingCommandUi<TTotals extends ObjByString, TSlotState extends ObjByString>(
  context: Pick<LocalContext, 'process'>,
  plugin: DashboardPlugin<TTotals, TSlotState>,
  viewerMode: boolean,
): PoolingCommandUi<TTotals, TSlotState> {
  const { process } = context;

  return {
    render: (input) =>
      dashboardPlugin(input, plugin, viewerMode, {
        stdout: process.stdout,
        cursorTo: readline.cursorTo,
        clearScreenDown: readline.clearScreenDown,
      }),
    installInteractiveSwitcher: viewerMode
      ? undefined
      : ({ workers, onCtrlC, getLogPaths, replayBytes, replayWhich, setPaused, repaint }) =>
          installInteractiveSwitcher({
            workers,
            onCtrlC,
            getLogPaths,
            replayBytes,
            replayWhich,
            ports: {
              stdin: process.stdin,
              stdout: process.stdout,
              stderr: process.stderr,
              emitKeypressEvents: readline.emitKeypressEvents,
            },
            onAttach: () => setPaused(true),
            onDetach: () => {
              setPaused(false);
              repaint();
            },
            onEnterAttachScreen: (id) => {
              setPaused(true);
              process.stdout.write('\x1b[2J\x1b[H');
              process.stdout.write(
                `Attached to worker ${id}. (Esc/Ctrl+] detach • Ctrl+D EOF • Ctrl+C SIGINT)\n`,
              );
            },
          }),
    extraKeyHandler: ({ logsBySlot, repaint, setPaused }) =>
      createExtraKeyHandler({
        logsBySlot,
        repaint,
        setPaused,
        stdout: process.stdout,
      }),
  };
}
