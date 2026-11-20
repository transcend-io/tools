import { PrivacyCenterAssetName } from '@transcend-io/privacy-types';

/** Privacy center branding asset slots exposed on `UpdatePrivacyCenterInput.assets`. */
export const PRIVACY_CENTER_ASSET_SLOTS = Object.values(
  PrivacyCenterAssetName,
) as readonly PrivacyCenterAssetName[];

export type PrivacyCenterAssetSlot = PrivacyCenterAssetName;
