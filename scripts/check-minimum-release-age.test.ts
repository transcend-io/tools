import { describe, expect, test } from 'vitest';

import { readRepoFile } from './lib/repo-files.ts';

const minimumReleaseAgePattern = /^minimumReleaseAge:\s*(\d+)\s*$/m;
const packageEntryPattern = /^  (?:'([^']+)'|([^\s][^:\n]*)):\s*$/gm;
const npmRegistryBaseUrl = 'https://registry.npmjs.org';
const millisecondsPerMinute = 60_000;
const registryConcurrency = 12;
const registryRetryCount = 3;

describe('minimum release age', () => {
  test('lockfile packages satisfy the configured minimum release age', async () => {
    const minimumReleaseAgeMinutes = readMinimumReleaseAgeMinutes();
    const lockfilePackages = getLockfilePackages();
    const packageVersionsByName = groupVersionsByPackageName(lockfilePackages);
    const failures = (
      await mapWithConcurrencyLimit(
        [...packageVersionsByName.entries()],
        registryConcurrency,
        async ([packageName, versions]) => {
          const packument = await fetchPackument(packageName);

          return [...versions].flatMap((version) => {
            const publishedAt = getPublishedAt(packument, version);

            if (publishedAt === undefined) {
              return [
                `${packageName}@${version} is missing a publish timestamp in the npm registry`,
              ];
            }

            const publishedAtTime = Date.parse(publishedAt);

            if (Number.isNaN(publishedAtTime)) {
              return [`${packageName}@${version} has an invalid publish timestamp: ${publishedAt}`];
            }

            const ageMinutes = Math.floor((Date.now() - publishedAtTime) / millisecondsPerMinute);

            if (ageMinutes < minimumReleaseAgeMinutes) {
              return [
                `${packageName}@${version} is only ${ageMinutes} minutes old (minimum is ${minimumReleaseAgeMinutes})`,
              ];
            }

            return [];
          });
        },
      )
    )
      .flat()
      .sort((a, b) => a.localeCompare(b));

    expect(failures).toEqual([]);
  }, 60_000);
});

function readMinimumReleaseAgeMinutes(): number {
  const workspaceConfig = readRepoFile('pnpm-workspace.yaml');
  const minimumReleaseAgeMatch = workspaceConfig.match(minimumReleaseAgePattern);

  if (minimumReleaseAgeMatch === null) {
    throw new Error('Unable to read minimumReleaseAge from pnpm-workspace.yaml');
  }

  const minimumReleaseAge = minimumReleaseAgeMatch[1];

  if (minimumReleaseAge === undefined) {
    throw new Error('Unable to parse minimumReleaseAge from pnpm-workspace.yaml');
  }

  return Number.parseInt(minimumReleaseAge, 10);
}

function getLockfilePackages(): string[] {
  const lockfileContents = readRepoFile('pnpm-lock.yaml');
  const packagesSectionMatch = lockfileContents.match(/^packages:\n([\s\S]*?)^snapshots:\n/m);

  if (packagesSectionMatch === null) {
    throw new Error('Unable to find the packages section in pnpm-lock.yaml');
  }

  const packagesSection = packagesSectionMatch[1];

  if (packagesSection === undefined) {
    throw new Error('Unable to parse the packages section in pnpm-lock.yaml');
  }

  return Array.from(
    packagesSection.matchAll(packageEntryPattern),
    (packageEntryMatch) => packageEntryMatch[1] ?? packageEntryMatch[2] ?? '',
  ).filter((packageKey) => packageKey.length > 0);
}

function groupVersionsByPackageName(lockfilePackageKeys: string[]): Map<string, Set<string>> {
  const packageVersionsByName = new Map<string, Set<string>>();

  for (const packageKey of lockfilePackageKeys) {
    const [packageName, packageVersion] = parseLockfilePackageKey(packageKey);
    const knownVersions = packageVersionsByName.get(packageName);

    if (knownVersions === undefined) {
      packageVersionsByName.set(packageName, new Set([packageVersion]));
      continue;
    }

    knownVersions.add(packageVersion);
  }

  return packageVersionsByName;
}

function parseLockfilePackageKey(packageKey: string): [string, string] {
  const normalizedPackageKey = packageKey.replace(/\(.+\)$/, '');
  const versionSeparatorIndex = normalizedPackageKey.lastIndexOf('@');

  if (versionSeparatorIndex <= 0) {
    throw new Error(`Unable to parse lockfile package entry: ${packageKey}`);
  }

  return [
    normalizedPackageKey.slice(0, versionSeparatorIndex),
    normalizedPackageKey.slice(versionSeparatorIndex + 1),
  ];
}

async function fetchPackument(packageName: string): Promise<unknown> {
  const requestUrl = `${npmRegistryBaseUrl}/${encodeURIComponent(packageName)}`;
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= registryRetryCount; attempt += 1) {
    try {
      const response = await fetch(requestUrl);

      if (!response.ok) {
        const shouldRetry = response.status === 429 || response.status >= 500;

        if (shouldRetry && attempt < registryRetryCount) {
          await sleep(attempt * 250);
          continue;
        }

        throw new Error(
          `Failed to fetch ${packageName} metadata from npm (${response.status} ${response.statusText})`,
        );
      }

      return await response.json();
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < registryRetryCount) {
        await sleep(attempt * 250);
        continue;
      }
    }
  }

  throw lastError ?? new Error(`Failed to fetch ${packageName} metadata from npm`);
}

function getPublishedAt(packument: unknown, packageVersion: string): string | undefined {
  if (typeof packument !== 'object' || packument === null) {
    return undefined;
  }

  const packumentTime = Reflect.get(packument, 'time');

  if (typeof packumentTime !== 'object' || packumentTime === null) {
    return undefined;
  }

  const publishedAt = Reflect.get(packumentTime, packageVersion);

  return typeof publishedAt === 'string' ? publishedAt : undefined;
}

async function mapWithConcurrencyLimit<T, TResult>(
  values: T[],
  concurrencyLimit: number,
  mapValue: (value: T) => Promise<TResult>,
): Promise<TResult[]> {
  const results = new Array<TResult>(values.length);
  let currentIndex = 0;

  await Promise.all(
    Array.from({ length: Math.min(concurrencyLimit, values.length) }, async () => {
      while (currentIndex < values.length) {
        const valueIndex = currentIndex;
        currentIndex += 1;
        const value = values[valueIndex];

        if (value === undefined) {
          continue;
        }

        results[valueIndex] = await mapValue(value);
      }
    }),
  );

  return results;
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
