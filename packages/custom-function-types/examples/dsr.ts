import type { CustomFunction } from '@transcend-io/custom-function-types';

/**
 * Record the identifier handled by a request enricher.
 *
 * @param argument - Services and payload provided for the enricher invocation
 */
export async function enricher({ kv, payload }: CustomFunction.EnricherArgument): Promise<void> {
  await kv.set('last-enriched-identifier', payload.requestIdentifier.value);
}

/**
 * Check connectivity before handling an access request.
 *
 * @param argument - Services and payload provided for the datapoint invocation
 */
export default async function customFunction({
  payload,
  sdk,
}: CustomFunction.Argument): Promise<void> {
  if (payload.type === 'ACCESS') {
    await sdk.ping();
  }
}
