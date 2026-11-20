import { readFileSync } from 'node:fs';

import { ErrorCode, ToolError } from '@transcend-io/mcp-server-base';
import { parseTranscendYaml, type TranscendInput } from '@transcend-io/sdk';

import { assertConfigFilePath } from './configFilePath.js';
import { stripEmptyConfigSections } from './sections.js';

/**
 * Read and parse a transcend.yml path from disk for config tools.
 *
 * @param filePath - Absolute path to the file
 * @param variables - Values for <<parameters.*>> placeholders
 * @returns Normalized source path and parsed input
 */
export function loadConfigFile(
  filePath: string,
  variables: Record<string, string> = {},
): { source: string; input: TranscendInput } {
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
    const input = stripEmptyConfigSections(parseTranscendYaml(contents, variables, source));
    return { source, input };
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
