import fs from 'node:fs';

import { decodeCodec } from '@transcend-io/type-utils';
import colors from 'colors';
import * as t from 'io-ts';

import { StoredApiKey } from '../../codecs.js';
import type { CliLogger } from '../../context.js';
import { logger } from '../../logger.js';

/**
 * Runtime dependencies used to validate a Transcend auth argument.
 */
export interface ValidateTranscendAuthDependencies {
  /** Filesystem methods used to inspect and read API key files */
  readonly fs: Pick<typeof fs, 'existsSync' | 'readFileSync'>;
  /** Exit the current runtime after a validation failure */
  readonly exit: (code?: number) => never;
  /** Logger used to report validation failures */
  readonly logger: CliLogger;
}

const defaultValidateTranscendAuthDependencies: ValidateTranscendAuthDependencies = {
  fs,
  exit: process.exit,
  logger,
};

/**
 * Determine if the `--auth` parameter is an API key or a path to a JSON
 * file containing a list of API keys.
 *
 * @param auth - Raw auth parameter
 * @param dependencies - Runtime dependencies
 * @returns The API key or the list API keys
 */
export function validateTranscendAuth(
  auth: string,
  dependencies: ValidateTranscendAuthDependencies = defaultValidateTranscendAuthDependencies,
): string | StoredApiKey[] {
  // Ensure auth is passed
  if (!auth) {
    dependencies.logger.error(
      colors.red(
        'A Transcend API key must be provided. You can specify using --auth=$TRANSCEND_API_KEY',
      ),
    );
    dependencies.exit(1);
  }

  // Read from disk
  if (dependencies.fs.existsSync(auth)) {
    // validate that file is a list of API keys
    return decodeCodec(t.array(StoredApiKey), dependencies.fs.readFileSync(auth, 'utf-8'));
  }

  // Return as single API key
  return auth;
}
