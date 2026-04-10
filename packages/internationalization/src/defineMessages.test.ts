import { describe, expect, it } from 'vitest';

import { defineMessages } from './defineMessages.js';

describe('defineMessages', () => {
  it('adds namespaced ids to each message definition', () => {
    expect(
      defineMessages('test-id', {
        dog: {
          defaultMessage: 'Test',
        },
      }),
    ).toEqual({
      dog: {
        id: 'test-id.dog',
        defaultMessage: 'Test',
      },
    });
  });
});
