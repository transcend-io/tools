/**
 * Minimal test worker for runPool integration tests.
 * Receives a task via IPC, "processes" it (writes a file), sends result back.
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

interface Task {
  file: string;
  outputDir: string;
}

process.on('message', (msg: { type: string; payload?: Task }) => {
  if (msg.type === 'task' && msg.payload) {
    const { file, outputDir } = msg.payload;
    const outPath = join(outputDir, `processed-${file}`);
    writeFileSync(outPath, `done:${file}`);
    process.send!({ type: 'result', payload: { file, ok: true } });
  }
  if (msg.type === 'shutdown') {
    process.exit(0);
  }
});

process.send!({ type: 'ready' });
