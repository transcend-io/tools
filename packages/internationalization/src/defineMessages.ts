import type { DefinedMessage } from './types.js';

/**
 * Defined messages keyed by message name.
 */
export type DefinedMessages<TNames extends string = string> = {
  /** Defined message keyed by its message name. */
  [key in TNames]: DefinedMessage;
};

/**
 * Message definitions before `defineMessages()` injects their generated IDs.
 */
type MessageDefinitions<TNames extends string> = {
  /** Message definition keyed by its message name. */
  [key in TNames]: Omit<DefinedMessage, 'id'>;
};

/**
 * Define intl messages for a container with a namespace applied to each message key.
 *
 * @param namespace - Namespace to prefix onto message IDs
 * @param messages - Message definitions keyed by name
 * @returns Message definitions with generated IDs
 */
export function defineMessages<TNames extends string>(
  namespace: string,
  messages: MessageDefinitions<TNames>,
): DefinedMessages<TNames> {
  return Object.fromEntries(
    (Object.keys(messages) as TNames[]).map((key) => [
      key,
      {
        ...messages[key],
        id: `${namespace}.${key}`,
      },
    ]),
  ) as DefinedMessages<TNames>;
}
