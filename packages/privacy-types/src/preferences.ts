import { makeEnum, valuesOf } from '@transcend-io/type-utils';
import * as t from 'io-ts';

import { IsoCountryCode, IsoCountrySubdivisionCode } from './isoRegion.js';

/**
 * Types of decryption status
 */
export const DecryptionStatus = makeEnum({
  DECRYPTED: 'DECRYPTED',
  ERROR: 'ERROR',
});

/** Type overrides */
export type DecryptionStatus = (typeof DecryptionStatus)[keyof typeof DecryptionStatus];

/**
 * Preference store identifier
 */
export const PreferenceStoreIdentifier = t.type({
  /** The identifier name (email, phone etc) */
  name: t.string,
  /** The identifier value */
  value: t.string,
});

/** Override type */
export type PreferenceStoreIdentifier = t.TypeOf<typeof PreferenceStoreIdentifier>;

/**
 * Preference store system attributes which are not user editable
 */
export const PreferenceStoreSystemAttributes = t.intersection([
  t.type({
    /** The decrypted status of the record */
    decryptionStatus: valuesOf(DecryptionStatus),
  }),
  t.partial({
    /** updated timestamp on the db record */
    updatedAt: t.string,
  }),
]);

/** Override type */
export type PreferenceStoreSystemAttributes = t.TypeOf<typeof PreferenceStoreSystemAttributes>;

/**
 *  Contains all the Consent management related fields
 *  that are stored in the preference store.
 */
export const PreferenceStoreConsentFields = t.type({
  /** US IAB Privacy String */
  usp: t.union([t.string, t.null]),
  /** IAB GPP String */
  gpp: t.union([t.string, t.null]),
  /** IAB TCF String */
  tcf: t.union([t.string, t.null]),
  /** Airgap Version */
  airgapVersion: t.union([t.string, t.null]),
});

/** Type override */
export type PreferenceStoreConsentFields = t.TypeOf<typeof PreferenceStoreConsentFields>;

/**
 * The format key required fields of the preference store record
 */
export const PreferenceStoreKeyConditionals = t.type({
  /** The partition key */
  partition: t.string,
  /** last consent event timestamp (ISO 8601) */
  timestamp: t.string,
});

/** Override type */
export type PreferenceStoreKeyConditionals = t.TypeOf<typeof PreferenceStoreKeyConditionals>;

/** The format for a preference which include topic and user choice */
export const Preference = t.type({
  /** The preference topic */
  topic: t.string,
  /** The preference choice made by the user */
  choice: t.partial({
    /** The boolean value of the preference */
    booleanValue: t.union([t.boolean, t.null]),
    /** The select value of the preference */
    selectValue: t.union([t.string, t.null]),
    /** The select values of the preference */
    selectValues: t.union([t.array(t.string), t.null]),
  }),
});

/** Override type. */
export type Preference = t.TypeOf<typeof Preference>;

/**
 * The format for a preference store purpose
 */
export const PreferenceStorePurposeResponse = t.intersection([
  t.type({
    /** tracking purpose */
    purpose: t.string,
    /** Whether the purpose is enabled */
    enabled: t.boolean,
  }),
  t.partial({
    /** additional preference associated with this purpose */
    preferences: t.array(Preference),
  }),
]);

/** Override type. */
export type PreferenceStorePurposeResponse = t.TypeOf<typeof PreferenceStorePurposeResponse>;

export const PreferenceQueryResponseItem = t.intersection([
  PreferenceStoreKeyConditionals,
  t.type({
    /** The system attributes of the record */
    system: PreferenceStoreSystemAttributes,
    /** Consent management related fields */
    consentManagement: t.partial(PreferenceStoreConsentFields.props),
    /** Preference store purposes */
    purposes: t.array(PreferenceStorePurposeResponse),
  }),
  t.partial({
    /** Primary identifier of the user. */
    userId: t.string,
    /** Identifiers associated to the user */
    identifiers: t.array(PreferenceStoreIdentifier),
    /** metadata */
    metadata: t.array(
      t.type({
        key: t.string,
        value: t.string,
      }),
    ),
    /** last updated for metadata */
    metadataTimestamp: t.string,
  }),
]);

/** Type override */
export type PreferenceQueryResponseItem = t.TypeOf<typeof PreferenceQueryResponseItem>;

export const CustomFieldApiInput = t.type({
  /** The attribute key that houses the attribute values */
  key: t.string,
  /** The attribute values used to label resources */
  values: t.array(t.string),
});

/** Override type */
export type CustomFieldApiInput = t.TypeOf<typeof CustomFieldApiInput>;

/** The format of the preference store workflow settings */
export const PreferenceStoreWorkflowSettings = t.partial({
  /** Additional tags to forward to the DSR event */
  attributes: t.array(CustomFieldApiInput),
  /** Data silo IDs to run the workflow on */
  dataSiloIds: t.array(t.string),
  /** The email template ID to use for the receipt */
  emailReceiptTemplateId: t.string,
  /** Data silo IDs to ignore when running the workflow */
  ignoreDataSiloIds: t.array(t.string),
  /** If the workflow is silent */
  isSilent: t.boolean,
  /** if the workflow is a test run */
  isTest: t.boolean,
  /** if the workflow should skip sending the receipt */
  skipSendingReceipt: t.boolean,
  /** if the workflow should skip the waiting period */
  skipWaitingPeriod: t.boolean,
  /** if the workflow should be skipped */
  skipWorkflowTrigger: t.boolean,
  /** Force trigger the workflow even when there was no concent/preference change */
  forceTriggerWorkflow: t.boolean,
  /** Country and/or country subdivision, to pass along to DSR request */
  region: t.partial({
    /** The country ISO code */
    country: valuesOf(IsoCountryCode),
    /** The country subdivision ISO code */
    countrySubDivision: valuesOf(IsoCountrySubdivisionCode),
  }),
  /** Language to translate request to */
  locale: t.string,
  /** The data subject type associated with the request */
  subjectType: t.string,
  /** The workflow's V2 configuration ID to use */
  workflowConfigId: t.string,
});

/** Override types. */
export type PreferenceStoreWorkflowSettings = t.TypeOf<typeof PreferenceStoreWorkflowSettings>;

/**
 * The format for a preference store purpose
 */
export const PreferenceStorePurposeUpdate = t.intersection([
  PreferenceStorePurposeResponse,
  t.partial({
    /** Timestamp of when the purpose was last updated (ISO 8601) */
    timestamp: t.string,
    /** Additional tags to forward to the DSR event */
    attributes: t.array(CustomFieldApiInput),
    /** Consent workflow settings */
    workflowSettings: PreferenceStoreWorkflowSettings,
    /** Language to translate request to */
    locale: t.string, // Should be LOCALE_KEY but omitting to allow for sombra to update independently
  }),
]);

/** Override type. */
export type PreferenceStorePurposeUpdate = t.TypeOf<typeof PreferenceStorePurposeUpdate>;

export const PreferenceUpdateItem = t.intersection([
  PreferenceStoreKeyConditionals,
  t.partial({
    /** Primary identifier of the user. */
    userId: t.string,
    /** Identifiers associated to the user */
    identifiers: t.array(PreferenceStoreIdentifier),
    /** Preference store purposes */
    purposes: t.array(PreferenceStorePurposeUpdate),
    /** Consent management related fields */
    consentManagement: t.partial(PreferenceStoreConsentFields.props),
    /**
     * Language to translate DSR processing
     * TODO: https://transcend.height.app/T-40208 - move this to `PreferenceStoreKeyConditionals` when stored on record
     */
    locale: t.string, // Should be LOCALE_KEY but omitting to allow for sombra to update independently
    /** The metadata associated with the record */
    metadata: t.array(
      t.type({
        /** metadata key */
        key: t.string,
        /**
         * metadata value
         *
         * - **null**: to remove the metadata key
         * - **string**: to set the metadata key
         */
        value: t.union([t.string, t.null]),
      }),
    ),
    /** User birthdate. Optional. Accepted formats: YYYY-MM-DD, YYYY-MM, or MM-YYYY. Format enforcement is in the main repo. */
    birthDate: t.string,
    /** Options to configure the upsert behavior */
    options: t.partial({
      /**
       * Whether to merge consent records, if the any one of the
       * identifiers in `identifiers` list is already associated to an existing record.
       *
       * If true, the consent record will be merged
       *  combining the identifiers and consent details.
       *
       * If false, an error will be returned if a conflict is detected.
       *
       * Default: true
       */
      mergeRecordsOnConflict: t.boolean,
    }),
  }),
]);

/** Type override */
export type PreferenceUpdateItem = t.TypeOf<typeof PreferenceUpdateItem>;

/**
 * The supported preference topic types
 */
export const PreferenceTopicType = makeEnum({
  Select: 'SELECT',
  MultiSelect: 'MULTI_SELECT',
  Boolean: 'BOOLEAN',
});

/** Override type */
export type PreferenceTopicType = (typeof PreferenceTopicType)[keyof typeof PreferenceTopicType];

/**
 * The authentication level required for updating a purpose on preference store
 */
export const PreferenceStoreAuthLevel = makeEnum({
  Required: 'REQUIRED',
  Optional: 'OPTIONAL',
  AllowOptOut: 'ALLOW_OPT_OUT',
});

/** Override type */
export type PreferenceStoreAuthLevel =
  (typeof PreferenceStoreAuthLevel)[keyof typeof PreferenceStoreAuthLevel];

/** The standard scopes which are used to access the Sombra APIs */
export const SombraStandardScope = makeEnum({
  /** Access to Preference Management APIs */
  PreferenceManagement: 'preferenceManagement',
  /** DSR Automation APIs */
  DSRAutomation: 'dsrAutomation',
});

/** Type override */
export type SombraStandardScope = (typeof SombraStandardScope)[keyof typeof SombraStandardScope];
