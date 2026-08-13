/**
 * Example DSR custom function: fulfill data subject request (DSR) operations
 * against an internal user-data API (e.g. a service in front of Snowflake).
 *
 * DSR custom functions expose up to two entry points:
 *
 * - The **default export** handles data-point operations — invoked for each
 *   request with `payload.type` set to the request action (test with
 *   `test-payload-type: DATA_POINT`, the default).
 * - The **`enricher` export** handles pre-flight request enrichment — e.g.
 *   resolving additional identifiers for the data subject (test with
 *   `test-payload-type: REQUEST_ENRICHER`).
 *
 * The `extras.dataSilo` block of the payload is injected automatically by the
 * CLI at test time from the function's DSR integration, so test-payload files
 * never hardcode data silo IDs.
 */

/** The DSR payload delivered to the function */
interface DsrPayload {
  /** The request action (ACCESS, ERASURE, ...) */
  type: string;
  /** The identifier under enrichment (enricher invocations only) */
  requestIdentifier?: {
    /** Identifier value (e.g. the email address) */
    value?: string;
    /** Identifier name (e.g. email) */
    name?: string;
  };
  /** Request context */
  extras: {
    /** The data subject profile (data-point invocations only) */
    profile?: {
      /** The identifier of the data subject (e.g. email) */
      identifier?: string;
    };
    /** The DSR integration (data silo) this function is attached to */
    dataSilo?: {
      /** Data silo ID */
      id: string;
      /** Data silo title */
      title: string;
    };
  };
}

/** Arguments passed to both entry points */
interface FunctionArgs {
  /** Environment variables from the manifest `env` block */
  environment: { [key: string]: string };
  /** The DSR payload */
  payload: DsrPayload;
}

/**
 * Resolve the data subject's identifier from the payload.
 *
 * Data-point invocations carry it in `extras.profile.identifier`; enricher
 * invocations carry it in the top-level `requestIdentifier.value`.
 *
 * @param payload - The DSR payload
 * @returns The identifier
 */
function requireIdentifier(payload: DsrPayload): string {
  const identifier = payload.extras?.profile?.identifier ?? payload.requestIdentifier?.value;
  if (!identifier) {
    throw new Error('Could not resolve the data subject identifier from the payload');
  }
  return identifier;
}

/**
 * Data-point handler: return the user's record for access requests, or
 * delete it for erasure requests.
 */
export default async function customFunction({
  environment,
  payload,
}: FunctionArgs): Promise<object | void> {
  const apiKey = environment['WAREHOUSE_API_KEY'];
  if (!apiKey) {
    throw new Error('Missing WAREHOUSE_API_KEY environment variable');
  }
  const identifier = requireIdentifier(payload);
  const userUrl = `https://warehouse.internal.example.com/users/${encodeURIComponent(identifier)}`;
  const headers = { Authorization: `Bearer ${apiKey}` };

  if (payload.type === 'ACCESS') {
    const response = await fetch(userUrl, { headers });
    if (response.status === 404) {
      return { found: false };
    }
    if (!response.ok) {
      throw new Error(`User lookup failed (${response.status}): ${await response.text()}`);
    }
    return (await response.json()) as object;
  }

  if (payload.type === 'ERASURE') {
    const response = await fetch(userUrl, { method: 'DELETE', headers });
    if (!response.ok && response.status !== 404) {
      throw new Error(`User erasure failed (${response.status}): ${await response.text()}`);
    }
    return;
  }

  throw new Error(`Unsupported request type: ${payload.type}`);
}

/**
 * Enricher handler: resolve additional identifiers for the data subject
 * before the request fans out to data points.
 */
export async function enricher({ environment, payload }: FunctionArgs): Promise<{
  /** Additional identifiers discovered for the data subject */
  identifiers: {
    /** Identifier name */
    name: string;
    /** Identifier value */
    value: string;
  }[];
}> {
  const apiKey = environment['WAREHOUSE_API_KEY'];
  if (!apiKey) {
    throw new Error('Missing WAREHOUSE_API_KEY environment variable');
  }
  const identifier = requireIdentifier(payload);

  const response = await fetch(
    `https://warehouse.internal.example.com/users/${encodeURIComponent(identifier)}/aliases`,
    { headers: { Authorization: `Bearer ${apiKey}` } },
  );
  if (response.status === 404) {
    return { identifiers: [] };
  }
  if (!response.ok) {
    throw new Error(`Alias lookup failed (${response.status}): ${await response.text()}`);
  }
  const aliases = (await response.json()) as string[];
  return {
    identifiers: aliases.map((value) => ({ name: 'email', value })),
  };
}
