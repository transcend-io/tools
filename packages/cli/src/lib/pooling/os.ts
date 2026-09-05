import { spawn } from 'node:child_process';
import { dirname } from 'node:path';

/**
 * Operating-system operations used by pooling helpers.
 */
export interface PoolingOsPorts {
  /** Return the current operating-system platform. */
  platform: () => NodeJS.Platform;
  /** Spawn a child process. */
  spawn: typeof spawn;
}

const defaultPorts: PoolingOsPorts = {
  platform: () => process.platform,
  spawn,
};

/**
 * Spawn a command in a detached process.
 * This is a best-effort attempt to run the command in the background.
 *
 * @param cmd - The command to run
 * @param args - The arguments for the command
 * @param ports - Optional process-spawning operation.
 * @returns True if the command was spawned successfully, false otherwise
 */
export function spawnDetached(
  cmd: string,
  args: string[],
  ports: Pick<PoolingOsPorts, 'spawn'> = defaultPorts,
): boolean {
  try {
    const child = ports.spawn(cmd, args, { stdio: 'ignore', detached: true });
    child.unref();
    return true;
  } catch {
    return false;
  }
}

/**
 * Open a path in the default application for that file type.
 *
 * @param p - The path to open
 * @param ports - Optional platform and process-spawning operations.
 * @returns True if the path was opened successfully, false otherwise
 */
export function openPath(p: string, ports: PoolingOsPorts = defaultPorts): boolean {
  if (!p || p.startsWith('(')) return false;
  if (ports.platform() === 'win32') {
    return spawnDetached('cmd', ['/c', 'start', '', p], ports);
  }
  return spawnDetached('xdg-open', [p], ports);
}

/**
 * Reveal a file in the file manager.
 *
 * @param p - The path to the file to reveal
 * @param ports - Optional platform and process-spawning operations.
 * @returns True if the file manager was opened successfully, false otherwise
 */
export function revealInFileManager(p: string, ports: PoolingOsPorts = defaultPorts): boolean {
  if (!p || p.startsWith('(')) return false;
  if (ports.platform() === 'darwin') return spawnDetached('open', ['-R', p], ports);
  if (ports.platform() === 'win32') {
    return spawnDetached('explorer.exe', ['/select,', p], ports);
  }
  return spawnDetached('xdg-open', [dirname(p)], ports); // Linux best-effort
}

/**
 * Copy text to the clipboard.
 * This is a best-effort attempt to copy text to the clipboard.
 *
 * @param text - The text to copy to the clipboard
 * @param ports - Optional platform and process-spawning operations.
 * @returns True if the text was copied successfully, false otherwise
 */
export function copyToClipboard(text: string, ports: PoolingOsPorts = defaultPorts): boolean {
  if (!text || text.startsWith('(')) return false;
  try {
    if (ports.platform() === 'darwin') {
      const p = ports.spawn('pbcopy');
      p.stdin?.end(text);
      return true;
    }
    if (ports.platform() === 'win32') {
      const p = ports.spawn('clip');
      p.stdin?.end(text.replace(/\n/g, '\r\n'));
      return true;
    }
    try {
      const p = ports.spawn('xclip', ['-selection', 'clipboard']);
      p.stdin?.end(text);
      return true;
    } catch {
      // Fallback to xsel if xclip is not available
    }
    try {
      const p2 = ports.spawn('xsel', ['--clipboard', '--input']);
      p2.stdin?.end(text);
      return true;
    } catch {
      // If both xclip and xsel fail, we can't copy to clipboard
    }
  } catch {
    // If spawning the process fails, we can't copy to clipboard
  }
  return false;
}
