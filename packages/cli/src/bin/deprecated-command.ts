#!/usr/bin/env node
import { initializeCliRuntime } from '../lib/cli/initializeCliRuntime.js';
import { logModernCommandRecommendation } from '../lib/cli/legacy-commands.js';

/**
 * Runs when a deprecated command is called.
 */
function main(): void {
  initializeCliRuntime();
  const command = process.argv.at(-1);
  const legacyCommand = command?.split('/').pop()?.trim();
  if (legacyCommand) {
    logModernCommandRecommendation(legacyCommand);
  } else {
    throw new Error('Deprecated command');
  }

  process.exit(1);
}

main();
