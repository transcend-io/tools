import { LOCALE_KEY } from '@transcend-io/internationalization';
import { makeEnum, valuesOf } from '@transcend-io/type-utils';
import * as t from 'io-ts';

import { AbsoluteUrlString, UIConfiguration } from './consentUiConfiguration.js';
import { ThemeConfiguration } from './consentUiTheme.js';

/**
 * Types representing the top-level consent UI configuration
 * Includes keys for regimes, variants, and themes
 */
/** Key representing a specific regime */
export const RegimeKey = t.string;

/** Override type */
export type RegimeKey = t.TypeOf<typeof RegimeKey>;

/** Key representing a specific consent UI variant */
export const VariantKey = t.string;

/** Override type */
export type VariantKey = t.TypeOf<typeof VariantKey>;

/** Key representing a specific theme */
export const ThemeKey = t.string;

/** Override type */
export type ThemeKey = t.TypeOf<typeof ThemeKey>;

/** String that represents an integer value */
export const IntegerString = t.string;

/** Override type */
export type IntegerString = t.TypeOf<typeof IntegerString>;

/** String that represents a DOM element ID */
export const DOMElementId = t.string;

/** Override type */
export type DOMElementId = t.TypeOf<typeof DOMElementId>;

/** String that represents a semicolon-delimited list of regime keys */
export const SemicolonDelimitedRegimeKeyString = t.string;

/** Override type */
export type SemicolonDelimitedRegimeKeyString = t.TypeOf<typeof SemicolonDelimitedRegimeKeyString>;

/**
 * Autofocus toggle values ("on" / "off").
 */
export const AutofocusToggle = makeEnum({
  /** Enable autofocus */
  On: 'on',
  /** Disable autofocus */
  Off: 'off',
});

/** Override type */
export type AutofocusToggle = (typeof AutofocusToggle)[keyof typeof AutofocusToggle];

/**
 * All valid autofocus values:
 * - `"on"` / `"off"`
 * - or a DOM element ID string
 */
export const AutofocusValues = t.union([valuesOf(AutofocusToggle), DOMElementId]);

/** Override type */
export type AutofocusValues = t.TypeOf<typeof AutofocusValues>;

/**
 * Shadow root options ("open" / "closed" / "none").
 */
export const ShadowRootOptions = makeEnum({
  /** Enable shadow root */
  Open: 'open',
  /** Disable shadow root */
  Closed: 'closed',
  /** Disable shadow root */
  None: 'none',
});

/** Override type */
export type ShadowRootOptions = (typeof ShadowRootOptions)[keyof typeof ShadowRootOptions];

/** The top-level configuration for the consent UI */
export const LoadOptions = t.intersection([
  t.type({
    regimeVariantMap: t.record(RegimeKey, VariantKey),
    regimeAutoPromptMap: t.record(RegimeKey, t.boolean),
    variantConfigMap: t.record(VariantKey, UIConfiguration),
    variantThemeMap: t.record(VariantKey, ThemeKey),
    themeConfigMap: t.record(ThemeKey, ThemeConfiguration),
    autofocus: AutofocusValues,
    uiZIndex: IntegerString,
    // If messageMap is not defined, messages will be fetched from `${messageFolder}/${localeKey}.json`
    messageFolder: AbsoluteUrlString,
    regimePrecedence: SemicolonDelimitedRegimeKeyString, // e.g. 'GDPR;CPRA;nFADP'
    uiShadowRoot: valuesOf(ShadowRootOptions),
  }),
  t.partial({
    // if css is defined and cssFolder is not, CSS will be fetched from the css load option
    css: AbsoluteUrlString,
    // if message map is defined, it will be used to retrieve localized messages
    messageMap: t.record(valuesOf(LOCALE_KEY), AbsoluteUrlString),
    forceTheme: ThemeKey,
    // if cssFolder is defined, per-theme CSS will be fetched from `${cssFolder}/${themeKey}.css`
    cssFolder: AbsoluteUrlString,
  }),
]);

/** Override type */
export type LoadOptions = t.TypeOf<typeof LoadOptions>;
