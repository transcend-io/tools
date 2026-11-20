export const NPM_REGISTRY_URL = 'https://registry.npmjs.org/';

export type NpmPackageLookup = {
  /** Package name that was looked up. */
  name: string;
  /** `missing` when the registry returns 404, `error` when the lookup fails for any other reason. */
  outcome: 'found' | 'missing' | 'error';
  /** HTTP status or network error for `error` outcomes. */
  reason?: string;
};

export async function lookUpNpmPackage(
  name: string,
  registryUrl: string = NPM_REGISTRY_URL,
): Promise<NpmPackageLookup> {
  // npm escapes only the scope separator (`@scope%2fname`).
  const url = new URL(name.replace('/', '%2f'), registryUrl);

  try {
    const response = await fetch(url, {
      headers: { accept: 'application/vnd.npm.install-v1+json' },
      signal: AbortSignal.timeout(15_000),
    });
    await response.body?.cancel();

    if (response.ok) {
      return { name, outcome: 'found' };
    }

    if (response.status === 404) {
      return { name, outcome: 'missing' };
    }

    return { name, outcome: 'error', reason: `HTTP ${response.status} from ${url.href}` };
  } catch (error) {
    return { name, outcome: 'error', reason: `${describeError(error)} (${url.href})` };
  }
}

function describeError(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }

  // Node's fetch reports "fetch failed" and keeps the real cause (e.g. ECONNRESET) on `cause`.
  return error.cause instanceof Error ? `${error.message}: ${error.cause.message}` : error.message;
}
