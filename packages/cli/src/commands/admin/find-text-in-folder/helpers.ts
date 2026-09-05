import { createReadStream } from 'node:fs';

/** Runtime dependencies for streaming file contents. */
export interface FileContainsExactBytesDependencies {
  /** Create a readable stream for a file */
  readonly createReadStream: typeof createReadStream;
}

/**
 * Streams through a file checking if it contains the needle (case-insensitive).
 *
 * @param filePath - Absolute path to the file to scan
 * @param needle - Lowercased needle as a Buffer
 * @param maxBytes - Optional byte limit per file
 * @param dependencies - Runtime dependencies for reading the file
 * @returns Whether the file contains the needle
 */
export function fileContainsExactBytes(
  filePath: string,
  needle: Buffer,
  maxBytes?: number,
  dependencies: FileContainsExactBytesDependencies = { createReadStream },
): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    const stream = dependencies.createReadStream(filePath);
    let carry = Buffer.alloc(0);
    const n = needle.length;
    let seen = 0;

    stream.on('data', (raw) => {
      let chunk = typeof raw === 'string' ? Buffer.from(raw) : raw;

      if (maxBytes) {
        const remaining = maxBytes - seen;
        if (remaining <= 0) {
          stream.destroy();
          resolve(false);
          return;
        }
        if (chunk.length > remaining) {
          chunk = chunk.subarray(0, remaining);
        }
        seen += chunk.length;
      }

      const buf = carry.length ? Buffer.concat([carry, chunk]) : chunk;
      const haystack = buf.toString('utf8').toLowerCase();
      if (haystack.includes(needle.toString('utf8'))) {
        stream.destroy();
        resolve(true);
        return;
      }

      // Keep last n-1 bytes to catch boundary matches
      if (n > 1) {
        carry = Buffer.from(buf.subarray(Math.max(0, buf.length - (n - 1))));
      } else {
        carry = Buffer.alloc(0);
      }
    });

    stream.on('error', reject);
    stream.on('close', () => resolve(false));
    stream.on('end', () => resolve(false));
  });
}
