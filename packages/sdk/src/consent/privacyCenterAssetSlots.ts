/** Privacy center branding asset slots exposed on `UpdatePrivacyCenterInput.assets`. */
export const PRIVACY_CENTER_ASSET_SLOTS = [
  'logo',
  'favicon',
  'logoOnSolid',
  'logoOnFooter',
  'hero',
  'widgetBg',
] as const;

export type PrivacyCenterAssetSlot = (typeof PRIVACY_CENTER_ASSET_SLOTS)[number];
