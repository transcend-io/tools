import type { LocaleValue } from './enums.js';

/**
 * Translations map from message id to translation string.
 */
export type TranslatedMessages = {
  /** Translation text keyed by message identifier. */
  [id in string]: string;
};

/**
 * Mapping of Transcend locale key to a message object.
 */
export type Translations = {
  /** Translated message bundle keyed by locale value. */
  [key in LocaleValue]: TranslatedMessages;
};

/**
 * Mapping of Transcend locale key (or description) to a message object.
 */
export type TranslationsWithDescriptions = {
  /** Translated message bundle keyed by locale value or shared description bucket. */
  [key in LocaleValue | 'description']: TranslatedMessages;
};

/**
 * Minimal message descriptor compatible with react-intl usage in Transcend code.
 */
export interface ReactIntlMessageDescriptor {
  /** ID */
  id?: string | number;
  /** Description */
  description?: string | object;
  /** Default message */
  defaultMessage?: string;
}

/**
 * Values to pass to a formatted message.
 */
export type MessageValues = {
  /** Interpolation value keyed by token name. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

/**
 * A concrete message definition used across the package.
 */
export interface DefinedMessage {
  /** ID of message */
  id: string;
  /** Default value of the message */
  defaultMessage: string;
  /** Message description */
  description?: string;
}
