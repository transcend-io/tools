import { describe, expect, it } from 'vitest';

import type { Message } from '../fetchAllMessages.js';
import { intlMessageStableKey, resolveIntlMessageMatch } from '../resolveIntlMessageMatch.js';

const sample = (overrides: Partial<Message>): Message => ({
  id: 'uuid-1',
  defaultMessage: 'Hello',
  description: '',
  targetReactIntlId: null,
  translations: [],
  ...overrides,
});

describe('resolveIntlMessageMatch', () => {
  const existing = [
    sample({ id: 'org-uuid', targetReactIntlId: 'ui.src.heroTitle' }),
    sample({ id: 'plain-id', targetReactIntlId: null }),
  ];

  it('matches by targetReactIntlId first', () => {
    expect(
      resolveIntlMessageMatch({ id: 'wrong', targetReactIntlId: 'ui.src.heroTitle' }, existing)?.id,
    ).toBe('org-uuid');
  });

  it('matches by id when id has no dots', () => {
    expect(resolveIntlMessageMatch({ id: 'plain-id' }, existing)?.id).toBe('plain-id');
  });

  it('matches yml id to an existing targetReactIntlId', () => {
    expect(
      resolveIntlMessageMatch(
        { id: 'ui.src.heroTitle', targetReactIntlId: 'ui.src.heroTitle' },
        existing,
      )?.id,
    ).toBe('org-uuid');
  });
});

describe('intlMessageStableKey', () => {
  it('prefers targetReactIntlId', () => {
    expect(intlMessageStableKey({ id: 'a', targetReactIntlId: 'b' })).toBe('b');
  });
});
