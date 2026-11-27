import { appendFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

import { withLockFile } from '../../src/oauth/credential-store/refresh-lock.js';

/**
 * Child process for the lock tests: takes the lock, logs when it enters and
 * leaves, and holds it for a while in between.
 *
 * Usage: `hold-lock.ts <lockPath> <logPath> <label> <holdMs>`
 */
const [lockPath, logPath, label, holdMs] = process.argv.slice(2);

await withLockFile(lockPath, async () => {
  appendFileSync(logPath, `enter ${label}\n`);
  await sleep(Number(holdMs));
  appendFileSync(logPath, `exit ${label}\n`);
});
