/**
 * Fields that the list of users can be filtered by
 */
export const UserOrderField = {
  /** In alphabetical order */
  Name: 'name',
  /** When the user was added */
  CreatedAt: 'createdAt',
  /** The time the user was updated */
  UpdatedAt: 'updatedAt',
} as const;

/** Type override */
export type UserOrderField = (typeof UserOrderField)[keyof typeof UserOrderField];
