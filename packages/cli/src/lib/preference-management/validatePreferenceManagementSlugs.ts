import type { TranscendInput } from '../../codecs.js';

/** Slugs for preference topics and option values must be alphabetical letters only. */
export const PREFERENCE_SLUG_REGEX = /^[A-Za-z]+$/;

/**
 * Validate preference topic and option value slugs before push.
 *
 * @param input - Parsed transcend.yml input
 * @returns List of validation error messages (empty when valid)
 */
export function validatePreferenceManagementSlugs(input: TranscendInput): string[] {
  const errors: string[] = [];

  const validateSlug = (slug: string, context: string): void => {
    if (!PREFERENCE_SLUG_REGEX.test(slug)) {
      errors.push(
        `${context}: slug "${slug}" is invalid — slugs must contain only alphabetical letters (A-Z, a-z). ` +
          'Topic slugs are normalized to PascalCase server-side, so YAML slugs should already be PascalCase ' +
          'or matching will break on subsequent pulls.',
      );
    }
  };

  for (const option of input['preference-options'] ?? []) {
    validateSlug(option.slug, 'preference-options');
  }

  for (const purpose of input.purposes ?? []) {
    for (const topic of purpose['preference-topics'] ?? []) {
      validateSlug(topic.slug, `purposes (topic "${topic.title}")`);
      for (const option of topic.options ?? []) {
        validateSlug(option.slug, `purposes (topic "${topic.title}" option "${option.title}")`);
      }
    }
  }

  return errors;
}
