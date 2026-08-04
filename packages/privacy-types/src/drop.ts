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
