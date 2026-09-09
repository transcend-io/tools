import fs from 'node:fs';

import { decodeCodec } from '@transcend-io/type-utils';
import colors from 'colors';
import * as t from 'io-ts';

import { StoredApiKey } from '../../codecs.js';
import type { LocalContext } from '../../context.js';
import { logger } from '../../logger.js';

/**
 * Determine if the `--auth` parameter is an API key or a path to a JSON
 * file containing a list of API keys.
 *
 * @param auth - Raw auth parameter
 * @param context - Optional command context
 * @returns The API key or the list API keys
 */
export function validateTranscendAuth(
  auth: string,
  context?: Pick<LocalContext, 'fs' | 'process' | 'logger'>,
): string | StoredApiKey[] {
  const runtimeFs = context?.fs ?? fs;
  const runtimeProcess = context?.process ?? process;
  const runtimeLogger = context?.logger ?? logger;

  // Ensure auth is passed
  if (!auth) {
    runtimeLogger.error(
      colors.red(
        'A Transcend API key must be provided. You can specify using --auth=$TRANSCEND_API_KEY',
      ),
    );
    runtimeProcess.exit(1);
  }

  // Read from disk
  if (runtimeFs.existsSync(auth)) {
    // validate that file is a list of API keys
    return decodeCodec(t.array(StoredApiKey), runtimeFs.readFileSync(auth, 'utf-8'));
  }

  // Return as single API key
  return auth;
}
