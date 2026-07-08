import { UserPrivacySignalEnum } from '@transcend-io/airgap.js-types';
import {
  DefaultConsentOption,
  PreferenceStoreAuthLevel,
  PreferenceTopicType,
} from '@transcend-io/privacy-types';
import { valuesOf } from '@transcend-io/type-utils';
import * as t from 'io-ts';

export const ConsentPreferenceTopicOptionValue = t.type({
  /** Title of option value */
  title: t.string,
  /** API slug */
  slug: t.string,
});

/** Type override */
export type ConsentPreferenceTopicOptionValue = t.TypeOf<typeof ConsentPreferenceTopicOptionValue>;

export const ConsentPreferenceTopic = t.intersection([
  t.type({
    /** The type of the preference topic */
    type: valuesOf(PreferenceTopicType),
    /** The title of the preference topic */
    title: t.string,
    /** The description of the preference topic */
    description: t.string,
    /** API slug for the preference topic (ConstantCase recommended) */
    slug: t.string,
  }),
  t.partial({
    /** Hex color for the preference topic (pull-only; not writable via CLI push today) */
    color: t.string,
    /** Default value */
    'default-configuration': t.string,
    /** Whether the preference topic is shown in privacy center */
    'show-in-privacy-center': t.boolean,
    /** The options when type is single or multi select */
    options: t.array(ConsentPreferenceTopicOptionValue),
  }),
]);

/** Type override */
export type ConsentPreferenceTopic = t.TypeOf<typeof ConsentPreferenceTopic>;

export const ConsentPurpose = t.intersection([
  t.type({
    /** Consent purpose slug */
    trackingType: t.string,
    /** The title of the tracking purpose that appears in Consent Management and Privacy Center UIs  */
    title: t.string,
    /** The display name of this tracking purpose */
    name: t.string,
  }),
  t.partial({
    /** Description of purpose */
    description: t.string,
    /** Whether purpose is active */
    'is-active': t.boolean,
    /** Whether purpose is configurable */
    configurable: t.boolean,
    /** Display order of purpose for privacy center */
    'display-order': t.number,
    /** Whether purpose is shown in privacy center */
    'show-in-privacy-center': t.boolean,
    /** Whether purpose is show in consent manger */
    'show-in-consent-manager': t.boolean,
    /** The preference topics configured for the purpose */
    'preference-topics': t.array(ConsentPreferenceTopic),
    /** Authentication level for purpose on privacy center */
    'auth-level': valuesOf(PreferenceStoreAuthLevel),
    /** Opt out signals that should instantly opt out of this purpose */
    'opt-out-signals': t.array(valuesOf(UserPrivacySignalEnum)),
    /** Default consent value */
    'default-consent': valuesOf(DefaultConsentOption),
  }),
]);

/** Type override */
export type ConsentPurpose = t.TypeOf<typeof ConsentPurpose>;

/** Preference topic nested under a purpose, tagged with its parent purpose trackingType for push */
export type PreferenceTopicWithPurpose = ConsentPreferenceTopic & {
  /** Purpose slug (trackingType) this topic belongs to */
  'tracking-type': string;
};
