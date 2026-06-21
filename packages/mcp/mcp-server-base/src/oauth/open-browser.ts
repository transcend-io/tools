import { spawn } from 'node:child_process';

import { type Logger } from '../clients/graphql/base.js';

/**
 * Opens the system default browser to the given URL (best-effort).
 */
export async function openBrowser(url: string, logger: Logger): Promise<void> {
  const { command, args } = getOpenCommand(url);

  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(command, args, {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      });

      child.on('error', reject);
      child.on('spawn', () => {
        child.unref();
        resolve();
      });
    });
  } catch (error) {
    logger.warn('Unable to open browser automatically. Please open this URL manually', {
      url,
      error,
    });
  }
}

/**
 * Determines the appropriate command to open the browser based on the platform.
 */
function getOpenCommand(url: string): { command: string; args: string[] } {
  if (process.platform === 'darwin') {
    return { command: 'open', args: [url] };
  }
  if (process.platform === 'win32') {
    return { command: 'cmd', args: ['/c', 'start', '', url] };
  }
  return { command: 'xdg-open', args: [url] };
}
