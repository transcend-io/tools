#!/usr/bin/env node
import { run } from '@stricli/core';

import { app } from '../app.js';
import { buildContext } from '../context.js';
import { initializeCliRuntime } from '../lib/cli/initializeCliRuntime.js';

/**
 * Entrypoint for `transcend` CLI
 */
async function main(): Promise<void> {
  initializeCliRuntime();
  await run(app, process.argv.slice(2), buildContext(process));
}

main();
