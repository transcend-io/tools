import { createReadStream, statSync } from 'node:fs';

/** File metadata needed when replaying a tail. */
export interface ReplayFileStat {
  /** File size in bytes */
  readonly size: number;
}

/** Dependencies used to replay a file tail. */
export interface ReplayFileTailToStdoutDependencies {
  /** Create a stream for the requested file range. */
  createReadStream: typeof createReadStream;
  /** Read file metadata synchronously. */
  statSync: (path: string) => ReplayFileStat;
}

const defaultDependencies: ReplayFileTailToStdoutDependencies = {
  createReadStream,
  statSync,
};

/**
 * Replay the tail of a file to stdout.
 *
 * @param path - The absolute path to the file to read.
 * @param maxBytes - The maximum number of bytes to read from the end of the file.
 * @param write - A function to write the output to stdout.
 * @param dependencies - File-system operations used by the replay.
 */
export async function replayFileTailToStdout(
  path: string,
  maxBytes: number,
  write: (s: string) => void,
  dependencies: ReplayFileTailToStdoutDependencies = defaultDependencies,
): Promise<void> {
  await new Promise<void>((resolve) => {
    try {
      const st = dependencies.statSync(path);
      const start = Math.max(0, st.size - maxBytes);
      const stream = dependencies.createReadStream(path, { start, encoding: 'utf8' });
      stream.on('data', (chunk) => write(chunk as string));
      stream.on('end', () => resolve());
      stream.on('error', () => resolve());
    } catch {
      resolve();
    }
  });
}
