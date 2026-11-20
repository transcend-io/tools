import {
  PRIVACY_CENTER_ASSET_SLOTS,
  type PrivacyCenterAssetSlot,
} from './privacyCenterAssetSlots.js';
import type { PrivacyCenterAssetsYamlInput } from './resolvePrivacyCenterAssetsForPush.js';

type GraphqlPrivacyCenterAsset = {
  id: string;
  src: string;
  alt?: { defaultMessage: string } | null;
} | null;

/**
 * Map GraphQL privacy center assets into transcend.yml shape.
 */
export function formatPrivacyCenterAssetsFromGraphql(
  assets: Partial<Record<string, GraphqlPrivacyCenterAsset>> | null | undefined,
): PrivacyCenterAssetsYamlInput {
  if (!assets) {
    return {};
  }

  const result: PrivacyCenterAssetsYamlInput = {};
  for (const slot of PRIVACY_CENTER_ASSET_SLOTS) {
    const asset = assets[slot];
    if (!asset) {
      continue;
    }
    result[slot] = {
      id: asset.id,
      src: asset.src,
      ...(asset.alt?.defaultMessage ? { alt: asset.alt.defaultMessage } : {}),
    };
  }
  return result;
}
