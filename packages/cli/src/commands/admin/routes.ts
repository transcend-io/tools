import { buildRouteMap } from '@stricli/core';

import { chunkCsvCommand } from './chunk-csv/command.js';
import { findTextInFolderCommand } from './find-text-in-folder/command.js';
import { generateApiKeysCommand } from './generate-api-keys/command.js';
import { parquetToCsvCommand } from './parquet-to-csv/command.js';

export const adminRoutes = buildRouteMap({
  routes: {
    'generate-api-keys': generateApiKeysCommand,
    'chunk-csv': chunkCsvCommand,
    'find-text-in-folder': findTextInFolderCommand,
    'parquet-to-csv': parquetToCsvCommand,
  },
  docs: {
    brief: 'Admin commands',
  },
});
