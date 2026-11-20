import path from 'node:path';

import { ErrorCode, ToolError } from '@transcend-io/mcp-server-base';

const YAML_EXTENSIONS = new Set(['.yml', '.yaml']);

/**
 * Validate the path an agent passes for a `transcend.yml` file.
 *
 * Absolute paths only, because the server's working directory is not the
 * agent's. YAML extensions only, so a tool call cannot overwrite arbitrary files.
 *
 * @param filePath - Path from the tool arguments
 * @returns The normalized absolute path
 * @throws ToolError when the path is relative or not a YAML file
 */
export function assertConfigFilePath(filePath: string): string {
  if (!path.isAbsolute(filePath)) {
    throw new ToolError(
      ErrorCode.VALIDATION_ERROR,
      `filePath must be absolute, got "${filePath}".`,
      false,
    );
  }
  const normalized = path.normalize(filePath);
  if (!YAML_EXTENSIONS.has(path.extname(normalized).toLowerCase())) {
    throw new ToolError(
      ErrorCode.VALIDATION_ERROR,
      `filePath must end in .yml or .yaml, got "${filePath}".`,
      false,
    );
  }
  return normalized;
}
