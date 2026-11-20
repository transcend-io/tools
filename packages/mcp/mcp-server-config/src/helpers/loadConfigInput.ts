import { readFileSync } from 'node:fs';

import { ErrorCode, ToolError } from '@transcend-io/mcp-server-base';
import { parseTranscendYaml, type TranscendInput } from '@transcend-io/sdk';

import { assertConfigFilePath } from './configFilePath.js';
import { stripEmptyConfigSections } from './sections.js';

/**
 * Read and parse a transcend.yml from disk for config push and preview tools.
 *
 * @param filePath - Absolute path to the YAML file
 * @param variables - Placeholder values for `<<parameters.*>>`
 * @returns Parsed, non-empty sections only
 */
export function loadConfigInput(
  filePath: string,
  variables: Record<string, string> = {},
): TranscendInput {
  const source = assertConfigFilePath(filePath);

  let contents: string;
  try {
    contents = readFileSync(source, 'utf-8');
  } catch (error) {
    throw new ToolError(
      ErrorCode.VALIDATION_ERROR,
      `Could not read ${source}: ${error instanceof Error ? error.message : String(error)}`,
      false,
    );
  }

  try {
    return stripEmptyConfigSections(parseTranscendYaml(contents, variables, source));
  } catch (error) {
    throw new ToolError(
      ErrorCode.VALIDATION_ERROR,
      `${source} is not a valid transcend.yml: ${
        error instanceof Error ? error.message : String(error)
      }`,
      false,
    );
  }
}
