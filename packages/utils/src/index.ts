const whitespacePattern = /\s+/g;

export interface DeveloperToolNameParts {
  displayName: string;
  slug: string;
}

export function normalizeDeveloperToolName(value: string): string {
  return value.trim().replace(whitespacePattern, ' ');
}

export function toPackageDisplayName(value: string): string {
  return normalizeDeveloperToolName(value)
    .split(' ')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(' ');
}

export function toPackageSlug(value: string): string {
  return normalizeDeveloperToolName(value).toLowerCase().replace(whitespacePattern, '-');
}

export function describePackageName(value: string): DeveloperToolNameParts {
  return {
    displayName: toPackageDisplayName(value),
    slug: toPackageSlug(value),
  };
}

export * from './logger.js';
export * from './splitInHalf.js';
export * from './sleepPromise.js';
export * from './extractErrorMessage.js';
export * from './getErrorStatus.js';
export * from './limitRecords.js';
export * from './RateCounter.js';
export * from './time.js';
export * from './retrySamePromise.js';
export * from './chunkOneCsvFile.js';
