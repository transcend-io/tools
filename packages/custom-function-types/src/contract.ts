/**
 * Customer-facing types available to every Transcend Custom Function.
 *
 * Import this namespace in a local project, or use it directly in Transcend's
 * Custom Function editor.
 */
export namespace CustomFunction {
  /** A privacy request operation delivered to a data subject request function. */
  export type RequestAction =
    | 'ACCESS'
    | 'ERASURE'
    | 'RECTIFICATION'
    | 'RESTRICTION'
    | 'BUSINESS_PURPOSE'
    | 'PLACE_ON_LEGAL_HOLD'
    | 'REMOVE_FROM_LEGAL_HOLD'
    | 'AUTOMATED_DECISION_MAKING_OPT_OUT'
    | 'USE_OF_SENSITIVE_INFORMATION_OPT_OUT'
    | 'CONTACT_OPT_OUT'
    | 'SALE_OPT_OUT'
    | 'TRACKING_OPT_OUT'
    | 'CUSTOM_OPT_OUT'
    | 'AUTOMATED_DECISION_MAKING_OPT_IN'
    | 'USE_OF_SENSITIVE_INFORMATION_OPT_IN'
    | 'SALE_OPT_IN'
    | 'TRACKING_OPT_IN'
    | 'CONTACT_OPT_IN'
    | 'CUSTOM_OPT_IN';

  /** The channel through which a privacy request entered Transcend. */
  export type RequestOrigin = 'PRIVACY_CENTER' | 'ADMIN_DASHBOARD' | 'API' | 'SHOPIFY';

  /** An environment variable configured for the Custom Function. */
  export interface Environment {
    /** Environment variable value by name. */
    [name: string]: string;
  }

  /** The authenticated identifier attached to every invocation. */
  export interface CoreIdentifier {
    /** The identifier value. */
    value: string;
  }

  /** The class of data subject making the request. */
  export interface DataSubject {
    /** Customer-defined data subject type. */
    type: string;
  }

  /** A custom field attached to a privacy request. */
  export interface RequestAttribute {
    /** Custom field name. */
    key?: string;
    /** Values assigned to the custom field. */
    values?: [string, ...string[]];
  }

  /** Consent partition information attached to a privacy request. */
  export interface Partition {
    /** Partition row ID. */
    id: string;
    /** Human-readable partition name. */
    name: string;
    /** Unique partition key. */
    partition: string;
  }

  /** Preference choice included with a consent-purpose change. */
  export interface PreferenceChoice {
    /** Selected scalar value. */
    selectValue?: string;
    /** Selected list values. */
    selectValues?: string[];
    /** Selected boolean value. */
    booleanValue?: boolean;
  }

  /** Preference included with a consent-purpose change. */
  export interface Preference {
    /** Preference topic. */
    topic: string;
    /** Current preference choice. */
    choice: PreferenceChoice;
  }

  /** Consent-purpose change that triggered the workflow. */
  export interface PurposeChange {
    /** Purpose name. */
    purpose: string;
    /** Whether the purpose is enabled. */
    enabled: boolean;
    /** Current preferences associated with the purpose. */
    preferences?: Preference[];
  }

  /** Privacy request metadata shared by data subject request payloads. */
  export interface Request {
    /** Free-form details added to the request. */
    details: string;
    /** Request ID. */
    id: string;
    /** URL path to the request in Transcend. */
    link: string;
    /** ISO-8601 creation timestamp. */
    createdAt: string;
    /** IETF BCP 47 locale. */
    locale: string;
    /** Channel through which the request entered Transcend. */
    origin: RequestOrigin;
    /** Custom fields attached to the request. */
    attributes?: RequestAttribute[];
    /** ISO 3166-1 alpha-2 country code, when available. */
    country?: string;
    /** ISO 3166-2 country subdivision code, when available. */
    countrySubDivision?: string;
    /** Consent partition to which the request is scoped. */
    partition?: Partition;
  }

  /** Transcend organization that owns the Custom Function. */
  export interface Organization {
    /** Organization ID. */
    id: string;
    /** Organization URI. */
    uri: string;
    /** Human-readable organization name. */
    name: string;
  }

  /** Metadata shared by data subject request payloads. */
  export interface CommonExtras {
    /** Privacy request being processed. */
    request: Request;
    /** Organization that owns the request. */
    organization: Organization;
    /** Consent-purpose change that triggered this request, when applicable. */
    purpose?: PurposeChange;
  }

  /** Fields shared by data subject request payloads. */
  export interface CommonPayloadProperties {
    /** Privacy request operation. */
    type: RequestAction;
    /** Information about the person making the request. */
    dataSubject: DataSubject;
    /** Whether this is a test request. */
    isTest: boolean;
  }

  /** Profile that a datapoint function should look up. */
  export interface Profile {
    /** Transcend profile ID. */
    id: string;
    /** Request-data-silo queue row ID. */
    RequestDataSiloId: string;
    /** Identifier value to look up. */
    identifier: string;
    /** Identifier descriptor, such as `email`. */
    type: string;
  }

  /** Integration associated with a datapoint invocation. */
  export interface DataSilo {
    /** Integration ID. */
    id: string;
    /** Integration title. */
    title: string;
    /** Integration description. */
    description: string;
    /** URL path to the integration in Transcend. */
    link: string;
  }

  /** Payload passed to the default export of a data subject request function. */
  export interface DataPointResolverProperties extends CommonPayloadProperties {
    /** Initial authenticated identifier submitted with the request. */
    coreIdentifier: CoreIdentifier;
    /** Datapoint-specific workflow metadata. */
    extras: CommonExtras & {
      /** Profile to look up. */
      profile: Profile;
      /** Integration being processed. */
      dataSilo: DataSilo;
      /** Asynchronous polling ID, when the integration is polling. */
      pollId: string | null | undefined;
    };
  }

  /** Input identifier passed to a request enricher. */
  export interface RequestIdentifier {
    /** Identifier type name. */
    name: string;
    /** Identifier value. */
    value: string;
  }

  /** Request-enricher configuration metadata. */
  export interface Enricher {
    /** Enricher ID. */
    id: string;
    /** Enricher title. */
    title: string;
  }

  /** Identifier type being enriched. */
  export interface Identifier {
    /** Identifier type ID. */
    id: string;
    /** Unique identifier type name. */
    name: string;
    /** Identifier category. */
    type: string;
  }

  /** Payload passed to the `enricher` export of a data subject request function. */
  export interface EnricherResolverProperties extends CommonPayloadProperties {
    /** Initial authenticated identifier submitted with the request. */
    coreIdentifier: CoreIdentifier;
    /** Identifier provided as input to the enricher. */
    requestIdentifier: RequestIdentifier;
    /** Enricher-specific workflow metadata. */
    extras: CommonExtras & {
      /** Enricher being processed. */
      enricher: Enricher;
      /** Identifier type being processed. */
      identifier: Identifier;
      /** Unique ID for this enricher and request combination. */
      requestEnricherId: string;
    };
  }

  /**
   * Webhook or schedule payload for a General Custom Function.
   *
   * Trigger data is free-form JSON. Transcend adds `coreIdentifier` on every
   * invocation; all other keys depend on the rule trigger or test payload.
   */
  export interface MaestroResolverProperties {
    /** Initial authenticated identifier added by Transcend. */
    coreIdentifier: CoreIdentifier;
    /** Webhook or schedule fields from the rule trigger. */
    [key: string]: unknown;
  }

  /**
   * Payload supplied when locally testing a datapoint export.
   *
   * Transcend adds `coreIdentifier` when it is omitted.
   */
  export type DataPointTestPayload = Omit<
    DataPointResolverProperties,
    'coreIdentifier' | 'extras'
  > & {
    /** Optional override for the identifier Transcend would add. */
    coreIdentifier?: CoreIdentifier;
    /** Test metadata accepted before Transcend prepares the handler payload. */
    extras: Omit<DataPointResolverProperties['extras'], 'profile' | 'pollId'> & {
      /** Profile supplied by the test fixture. */
      profile: Omit<Profile, 'type'> & {
        /** Optional identifier descriptor accepted by the test endpoint. */
        type?: string | null;
      };
      /** Optional asynchronous polling ID accepted by the test endpoint. */
      pollId?: string | null;
    };
  };

  /**
   * Payload supplied when locally testing a request-enricher export.
   *
   * Transcend adds `coreIdentifier` when it is omitted.
   */
  export type EnricherTestPayload = Omit<
    EnricherResolverProperties,
    'coreIdentifier' | 'extras'
  > & {
    /** Optional override for the identifier Transcend would add. */
    coreIdentifier?: CoreIdentifier;
    /** Test metadata accepted before Transcend prepares the handler payload. */
    extras: EnricherResolverProperties['extras'] & {
      /** Integration used to route an unsaved test invocation. */
      dataSilo?: DataSilo;
    };
  };

  /**
   * Payload supplied when locally testing a General Custom Function.
   *
   * Transcend adds `coreIdentifier` when it is omitted.
   */
  export interface MaestroTestPayload {
    /** Optional override for the identifier Transcend would add. */
    coreIdentifier?: CoreIdentifier;
    /** Webhook or schedule fields from the test fixture. */
    [key: string]: unknown;
  }

  /** Values accepted by the Custom Function key-value store. */
  export type KVSerializableValue = string;

  /** Persistent key-value store injected into a Custom Function. */
  export interface KV {
    /**
     * Retrieve a stored value.
     *
     * @param key - Stored value name
     * @returns Stored value, or `null` when the key does not exist
     */
    get: (key: string) => Promise<KVSerializableValue | null>;
    /**
     * Store a value.
     *
     * Keys are limited to 128 bytes, values to 2,048 bytes, and each Custom
     * Function may store at most 128 keys.
     *
     * @param key - Stored value name
     * @param value - Value to store
     */
    set: (key: string, value: KVSerializableValue) => Promise<void>;
    /**
     * List all stored keys.
     *
     * @returns Stored value names
     */
    keys: () => Promise<string[]>;
    /**
     * Check whether a key has a non-null value.
     *
     * @param key - Stored value name
     * @returns Whether the key has a value
     */
    has: (key: string) => Promise<boolean>;
    /**
     * Delete a stored value.
     *
     * @param key - Stored value name
     * @returns Whether the key existed
     */
    del: (key: string) => Promise<boolean>;
  }

  /** Convenience client for calling Transcend APIs. */
  export interface SDK {
    /**
     * Return the nonce generated for this workflow invocation.
     *
     * @returns Workflow invocation nonce
     */
    nonce(): string;
    /**
     * Override the customer-ingress API base URL.
     *
     * @param newUrl - Customer-ingress API base URL
     */
    setCustomerIngressUrl(newUrl: string): void;
    /** Check the connection to Transcend. */
    ping(): Promise<void>;
    /**
     * Call a Transcend API path with the required Custom Function
     * authentication.
     *
     * @param path - Transcend API path
     * @param options - Fetch request options
     * @returns Fetch response
     */
    fetch(path: `/${string}`, options?: RequestInit): Promise<Response>;
  }

  /** Values injected into every Custom Function handler. */
  export interface Argument<Payload = DataPointResolverProperties> {
    /** Customer-configured environment variables. */
    environment: Environment;
    /** Workflow payload for the selected function export. */
    payload: Payload;
    /** Convenience client for calling Transcend APIs. */
    sdk: SDK;
    /** Persistent key-value store. */
    kv: KV;
  }

  /** Argument passed to a data subject request enricher export. */
  export type EnricherArgument = Argument<EnricherResolverProperties>;

  /** Argument passed to a General Custom Function. */
  export type MaestroArgument = Argument<MaestroResolverProperties>;

  /** Supported return type for a Custom Function handler. */
  export type HandlerResult = void | Promise<void>;

  /**
   * Default data subject request datapoint handler.
   *
   * @param argument - Datapoint invocation values
   * @returns Handler completion
   */
  export type DataPointHandler = (argument: Argument<DataPointResolverProperties>) => HandlerResult;

  /**
   * Data subject request enricher handler.
   *
   * @param argument - Request-enricher invocation values
   * @returns Handler completion
   */
  export type EnricherHandler = (argument: EnricherArgument) => HandlerResult;

  /**
   * General Custom Function handler.
   *
   * @param argument - General invocation values
   * @returns Handler completion
   */
  export type MaestroHandler = (argument: MaestroArgument) => HandlerResult;
}
