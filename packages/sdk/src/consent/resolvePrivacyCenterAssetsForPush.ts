import type { GraphQLClient } from 'graphql-request';

import type {
  PrivacyCenterBrandingAssetInput,
  PrivacyCenterBrandingAssetsInput,
} from '../transcend-yml/codecs.js';
import type { PrivacyCenterAssetSlot } from './privacyCenterAssetSlots.js';
import { uploadAssetFileFromUrl } from './uploadAssetFileFromUrl.js';

export type PrivacyCenterAssetYamlInput = PrivacyCenterBrandingAssetInput;

export type PrivacyCenterAssetsYamlInput = PrivacyCenterBrandingAssetsInput;

/**
 * Resolve transcend.yml privacy center assets into GraphQL `UpdatePrivacyCenterAssetsInput`.
 *
 * @param client - GraphQL client (for auth headers and API host)
 * @param assets - Asset definitions from transcend.yml
 */
export async function resolvePrivacyCenterAssetsForPush(
  client: GraphQLClient,
  assets: PrivacyCenterAssetsYamlInput,
): Promise<
  Partial<
    Record<
      PrivacyCenterAssetSlot,
      {
        id: string;
        alt?: string;
      }
    >
  >
> {
  const rawHeaders = client.requestConfig.headers;
  const headers = typeof rawHeaders === 'function' ? rawHeaders() : rawHeaders;
  const authorization =
    headers && typeof headers === 'object' && !Array.isArray(headers)
      ? (headers as Record<string, string>).Authorization
      : undefined;
  if (typeof authorization !== 'string' || authorization.length === 0) {
    throw new Error('GraphQL client is missing an Authorization header for asset uploads');
  }
  const graphqlEndpoint = (client as unknown as { url: string }).url;
  const transcendUrl = new URL(graphqlEndpoint).origin;

  const resolved: Partial<Record<PrivacyCenterAssetSlot, { id: string; alt?: string }>> = {};

  for (const [slot, asset] of Object.entries(assets) as [
    PrivacyCenterAssetSlot,
    PrivacyCenterAssetYamlInput,
  ][]) {
    if (!asset) {
      continue;
    }

    let assetId = asset.id;
    if (!assetId && asset.src) {
      const uploaded = await uploadAssetFileFromUrl(transcendUrl, authorization, asset.src);
      assetId = uploaded.id;
    }
    if (!assetId) {
      continue;
    }

    resolved[slot] = {
      id: assetId,
      ...(asset.alt ? { alt: asset.alt } : {}),
    };
  }

  return resolved;
}
