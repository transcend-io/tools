/** The six DROP list types as written on the wire. */
export const DropListType = {
  Email: 'email',
  Phone: 'phone',
  Maid: 'maid',
  Ctv: 'ctv',
  Ndz: 'ndz',
  NameVin: 'name_vin',
} as const;
/** Type override */
export type DropListType = (typeof DropListType)[keyof typeof DropListType];

/**
 * Longest `dropRecordId` accepted on DROP ingress payloads and persisted on
 * `DropRunRequest`.
 */
export const DROP_RECORD_ID_MAX_LENGTH = 64;
