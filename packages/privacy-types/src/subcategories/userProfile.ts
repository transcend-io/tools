import { makeEnum } from '@transcend-io/type-utils';

export const UserProfileSubCategory = {
  /** A link to an individual's profile picture */
  ProfilePictureURL: 'PROFILE_PICTURE_URL',
  /** An individual's profile picture */
  ProfilePictureImage: 'PROFILE_PICTURE_IMAGE',
  /** The user's stated preferences while using an app */
  UserPreferences: 'USER_PREFERENCES',
  /** Fallback subcategory */
  UserProfile: 'USER_PROFILE',
} as const;

/**
 * Overload with type of integration
 */
export type UserProfileSubCategory =
  (typeof UserProfileSubCategory)[keyof typeof UserProfileSubCategory];
