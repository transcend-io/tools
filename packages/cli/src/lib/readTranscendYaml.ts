import { readFileSync, writeFileSync } from 'node:fs';

import {
  parseTranscendYaml,
  serializeTranscendYaml,
  type TranscendInput,
} from '@transcend-io/sdk/transcend-yml';
import type { ObjByString } from '@transcend-io/type-utils';

/**
 * Read in the contents of a YAML file and validate that its shape matches the codec API.
 *
 * @param filePath - Path to YAML file.
 * @param variables - Variables to fill in.
 * @returns The parsed contents, type-checked.
 */
export function readTranscendYaml(filePath: string, variables: ObjByString = {}): TranscendInput {
  return parseTranscendYaml(readFileSync(filePath, 'utf-8'), variables, filePath);
}

/**
 * Write a Transcend configuration to disk.
 *
 * @param filePath - Path to YAML file.
 * @param input - The input to write out.
 */
export function writeTranscendYaml(filePath: string, input: TranscendInput): void {
  writeFileSync(filePath, serializeTranscendYaml(input));
}
