import type { Message } from './fetchAllMessages.js';
import type { IntlMessageInput } from './syncIntlMessages.js';

/**
 * Stable key for deduplicating intl message rows in transcend.yml.
 */
export function intlMessageStableKey(
  message: Pick<IntlMessageInput, 'id' | 'targetReactIntlId'>,
): string {
  return message.targetReactIntlId ?? message.id;
}

/**
 * Find an existing intl message for a yml row when pushing across orgs.
 *
 * Match order: targetReactIntlId, then id (when id has no dots), then id equals
 * an existing targetReactIntlId.
 */
export function resolveIntlMessageMatch(
  input: IntlMessageInput,
  existing: Message[],
): Message | undefined {
  if (input.targetReactIntlId) {
    const byTarget = existing.find(
      (message) => message.targetReactIntlId === input.targetReactIntlId,
    );
    if (byTarget) {
      return byTarget;
    }
  }

  if (!input.id.includes('.')) {
    const byId = existing.find((message) => message.id === input.id);
    if (byId) {
      return byId;
    }
  }

  return existing.find((message) => message.targetReactIntlId === input.id);
}
