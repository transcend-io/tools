import { spawn } from 'node:child_process';

/**
 * Opens the system default browser to the given URL (best-effort).
 */
export async function openBrowser(url: string): Promise<void> {
  const { command, args } = getOpenCommand(url);

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
