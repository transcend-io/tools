import { makeEnum } from '@transcend-io/type-utils';

export const SocialMediaSubCategory = {
  /** A link to an individual's social media profile */
  ProfileURL: 'PROFILE_URL',
  /** Fallback subcategory */
  SocialMedia: 'SOCIAL_MEDIA',
} as const;

/**
 * Overload with type of integration
 */
export type SocialMediaSubCategory =
  (typeof SocialMediaSubCategory)[keyof typeof SocialMediaSubCategory];
