import packageJson from '../package.json' with { type: 'json' };

/** Exact published package version, sourced from this package's manifest. */
export const CUSTOM_FUNCTION_TYPES_VERSION = packageJson.version;

export type { CustomFunction } from './contract.js';
export * from './schema.js';
