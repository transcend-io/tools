import fs from 'node:fs';
import path from 'node:path';

import { CodePackageInput } from '../../codecs.js';
import type { CliLogger } from '../../context.js';
import { logger } from '../../logger.js';

/** Runtime dependencies used while parsing code package files. */
export interface CodeScanningFileRuntime {
  /** Filesystem operations used to read and list package files. */
  readonly fs: Pick<typeof fs, 'existsSync' | 'readdirSync'> & {
    /** Read a code package file as text. */
    readonly readFileSync: (filePath: string, encoding: BufferEncoding) => string;
  };
  /** Path operations used to locate and name package files. */
  readonly path: Pick<typeof path, 'basename' | 'dirname' | 'join'>;
}

/** Runtime dependencies used while discovering code package files. */
export interface CodeScanningRuntime extends CodeScanningFileRuntime {
  /** Logger used to report scan progress. */
  readonly logger: Pick<CliLogger, 'info'>;
}

/** Default runtime for direct code scanning integration calls. */
export const defaultCodeScanningFileRuntime: CodeScanningFileRuntime = { fs, path };

/** Default runtime for code scanning orchestrators. */
export const defaultCodeScanningRuntime: CodeScanningRuntime = {
  ...defaultCodeScanningFileRuntime,
  logger,
};

export interface CodeScanningConfig {
  /** Directories to ignore when traversing */
  ignoreDirs: string[];
  /** Types of file that are supported */
  supportedFiles: string[];
  /** The function that will parse in a code package configuration given an input file */
  scanFunction: (
    filePath: string,
    runtime?: CodeScanningFileRuntime,
  ) => Omit<CodePackageInput, 'repositoryName' | 'relativePath' | 'type'>[];
}
