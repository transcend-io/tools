import { readFileSync, writeFileSync } from 'node:fs';

import { decodeCodec, ObjByString } from '@transcend-io/type-utils';
import yaml from 'js-yaml';

import { TranscendInput } from '../codecs.js';

export const VARIABLE_PARAMETERS_REGEXP = /<<parameters\.(.+?)>>/;
export const VARIABLE_PARAMETERS_NAME = 'parameters';

/**
 * Function that replaces variables in a text file.
 * Throws error if there are variables that have not been replaced
 *
 * @param input - Input text
 * @param variables - Variables to replace
 * @param extraErrorMessage - Additional error message text
 * @returns Output text
 */
export function replaceVariablesInYaml(
  input: string,
  variables: ObjByString,
  extraErrorMessage = '',
): string {
  let contents = input;
  // Replace variables
  Object.entries(variables).forEach(([name, value]) => {
    contents = contents.split(`<<${VARIABLE_PARAMETERS_NAME}.${name}>>`).join(value);
  });

  // Throw error if unfilled variables
  if (VARIABLE_PARAMETERS_REGEXP.test(contents)) {
    const [, name] = VARIABLE_PARAMETERS_REGEXP.exec(contents) || [];
    throw new Error(
      `Found variable that was not set: ${name}.
Make sure you are passing all parameters through the --${VARIABLE_PARAMETERS_NAME}=${name}:value-for-param flag.
${extraErrorMessage}`,
    );
  }

  return contents;
}

/**
 * Parse YAML contents and validate that their shape matches the codec API.
 *
 * @param contents - YAML contents.
 * @param variables - Variables to fill in
 * @param sourcePath - Optional source path included in variable errors.
 * @returns The parsed contents, type-checked.
 */
export function parseTranscendYaml(
  contents: string,
  variables: ObjByString = {},
  sourcePath?: string,
): TranscendInput {
  const replacedVariables = replaceVariablesInYaml(
    contents,
    variables,
    sourcePath
      ? `Also check that there are no extra variables defined in your yaml: ${sourcePath}`
      : '',
  );

  return decodeCodec(TranscendInput, yaml.load(replacedVariables));
}

/**
 * Serialize a validated Transcend configuration as YAML.
 *
 * @param input - The input to serialize.
 * @returns YAML contents.
 */
export function serializeTranscendYaml(input: TranscendInput): string {
  return yaml.dump(decodeCodec(TranscendInput, input));
}

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
