/* eslint-disable max-lines */
import * as t from 'io-ts';

/**
 * reference: https://developer.onetrust.com/onetrust/reference/getriskusingget
 * Return types of the "Get Risk" endpoint
 */
const OneTrustEntityType = t.type({
  /** Indicates whether entity type is eligible for linking/relating with risk or not */
  eligibleForEntityLink: t.boolean,
  /** Indicates whether the entity type is enabled or not. */
  enabled: t.boolean,
  /** Entity Type ID. This can be Assets, Entities, PIA, Engagement, Custom Object GUID in form of String. */
  id: t.string,
  /** Entity Type Name. */
  label: t.string,
  /** Name of the module. */
  moduleName: t.union([t.string, t.null]),
  /** Indicates whether this type can be risk type or not in Risk */
  riskType: t.boolean,
  /** For Base Entity Type Seeded is true and false for Custom Object/Entity Types by default. */
  seeded: t.boolean,
  /** Indicates whether this type can be source type or not in Risk */
  sourceType: t.boolean,
  /** Translation Key of Entity Type ID. */
  translationKey: t.string,
});

const OneTrustRiskLevel = t.type({
  /** Risk Impact Level name. */
  impactLevel: t.union([t.string, t.null]),
  /** Risk Impact level ID. */
  impactLevelId: t.union([t.number, t.null]),
  /** Risk Level Name. */
  level: t.union([t.string, t.null]),
  /** Risk Level ID. */
  levelId: t.union([t.number, t.null]),
  /** Risk Probability Level Name. */
  probabilityLevel: t.union([t.string, t.null]),
  /** Risk Probability Level ID. */
  probabilityLevelId: t.union([t.number, t.null]),
  /** Risk Score. */
  riskScore: t.union([t.number, t.null]),
});

export const OneTrustRiskCategories = t.array(
  t.intersection([
    t.partial({
      /** Whether the category was seeded */
      seeded: t.boolean,
    }),
    t.type({
      /** Identifier for Risk Category. */
      id: t.string,
      /** Risk Category Name. */
      name: t.string,
      /** Risk Category Name Key value for translation. */
      nameKey: t.string,
    }),
  ]),
);
/** Type override */
export type OneTrustRiskCategories = t.TypeOf<typeof OneTrustRiskCategories>;

export const OneTrustRiskReference = t.type({
  /** The id of the risk reference */
  id: t.string,
  /** The type of the risk reference */
  type: t.string,
  /** The reference type of the risk reference */
  referenceType: OneTrustEntityType,
  /** The name of the risk reference */
  name: t.union([t.string, t.null]),
  /** The additional attributes of the risk reference */
  additionalAttributes: t.object,
});
/** Type override */
export type OneTrustRiskReference = t.TypeOf<typeof OneTrustRiskReference>;

export const OneTrustRiskReferences = t.array(OneTrustRiskReference);

/** Type override */
export type OneTrustRiskReferences = t.TypeOf<typeof OneTrustRiskReferences>;

export const OneTrustRiskTemplate = t.type({
  /** The id of the risk template */
  id: t.union([t.string, t.null]),
  /** The name of the risk template */
  name: t.union([t.string, t.null]),
});
/** Type override */
export type OneTrustRiskTemplate = t.TypeOf<typeof OneTrustRiskTemplate>;

export const OneTrustGetRiskResponse = t.type({
  /** The risk references */
  references: OneTrustRiskReferences,
  /** Whether the risk is closed */
  closed: t.boolean,
  /** The risk template */
  riskTemplate: OneTrustRiskTemplate,
  /** The currentStageApproversCount */
  currentStageApproversCount: t.number,
  /** List of associated inventories to the risk. */
  associatedInventories: t.array(
    t.type({
      /** ID of the Inventory. */
      inventoryId: t.string,
      /** Name of the Inventory. */
      inventoryName: t.string,
      /** Type of the Inventory. */
      inventoryType: t.union([
        t.literal('ASSETS'),
        t.literal('PROCESSING_ACTIVITIES'),
        t.literal('VENDORS'),
        t.literal('ENTITIES'),
        t.null,
      ]),
      /** ID of the Inventory's Organization. */
      organizationId: t.union([t.string, t.null]),
      /** The source type */
      sourceType: OneTrustEntityType,
    }),
  ),
  /** The attribute values associated with the risk */
  attributeValues: t.object,
  /** List of categories. */
  categories: OneTrustRiskCategories,
  /** List of Control Identifiers. */
  controlsIdentifier: t.array(t.string),
  /** Risk created time. */
  createdUTCDateTime: t.union([t.string, t.null]),
  /** Risk Creation Type. */
  creationType: t.union([t.string, t.null]),
  /** Date when the risk is closed. */
  dateClosed: t.union([t.string, t.null]),
  /** Deadline date for the risk. */
  deadline: t.union([t.string, t.null]),
  /** Risk delete type. */
  deleteType: t.union([t.literal('SOFT'), t.null]),
  /** Risk description. */
  description: t.union([t.string, t.null]),
  /** ID of the risk. */
  id: t.string,
  /** Residual impact level ID. */
  impactLevelId: t.union([t.number, t.null]),
  /** The inherent risk level */
  inherentRiskLevel: OneTrustRiskLevel,
  /** The risk justification */
  justification: t.union([t.string, t.null]),
  /** Residual level display name. */
  levelDisplayName: t.union([t.string, t.null]),
  /** Residual level ID. */
  levelId: t.union([t.number, t.null]),
  /** Risk mitigated date. */
  mitigatedDate: t.union([t.string, t.null]),
  /** Risk Mitigation details. */
  mitigation: t.union([t.string, t.null]),
  /** Short Name for a Risk. */
  name: t.union([t.string, t.null]),
  /** Integer risk identifier. */
  number: t.number,
  /** The organization group */
  orgGroup: t.intersection([
    t.type({
      /** The ID of the organization group */
      id: t.string,
      /** The name of the organization group */
      name: t.string,
    }),
    t.partial({
      /** The name key of the template */
      nameKey: t.union([t.string, t.null]),
    }),
  ]),
  /** The previous risk state */
  previousState: t.union([
    t.literal('IDENTIFIED'),
    t.literal('RECOMMENDATION_ADDED'),
    t.literal('RECOMMENDATION_SENT'),
    t.literal('REMEDIATION_PROPOSED'),
    t.literal('EXCEPTION_REQUESTED'),
    t.literal('REDUCED'),
    t.literal('RETAINED'),
    t.literal('ARCHIVED_IN_VERSION'),
    t.null,
  ]),
  /** Residual probability level. */
  probabilityLevel: t.union([t.string, t.null]),
  /** Residual probability level ID. */
  probabilityLevelId: t.union([t.number, t.null]),
  /** Risk Recommendation. */
  recommendation: t.union([t.string, t.null]),
  /** Proposed remediation. */
  remediationProposal: t.union([t.string, t.null]),
  /** Deadline reminder days. */
  reminderDays: t.union([t.number, t.null]),
  /** Risk exception request. */
  requestedException: t.union([t.string, t.null]),
  /** Risk Result. */
  result: t.union([
    t.literal('Accepted'),
    t.literal('Avoided'),
    t.literal('Reduced'),
    t.literal('Rejected'),
    t.literal('Transferred'),
    t.literal('Ignored'),
    t.null,
  ]),
  /** Risk approvers name csv. */
  riskApprovers: t.union([t.string, t.null]),
  /** Risk approvers ID. */
  riskApproversId: t.array(t.string),
  /** List of risk owners ID. */
  riskOwnersId: t.union([t.array(t.string), t.null]),
  /** Risk owners name csv. */
  riskOwnersName: t.union([t.string, t.null]),
  /** Risk score. */
  riskScore: t.union([t.number, t.null]),
  /** The risk source type */
  riskSourceType: OneTrustEntityType,
  /** The risk type */
  riskType: OneTrustEntityType,
  /** For Auto risk, rule Id reference. */
  ruleRootVersionId: t.union([t.string, t.null]),
  /** The risk source */
  source: t.type({
    /** Additional information about the Source Entity */
    additionalAttributes: t.object,
    /** Source Entity ID. */
    id: t.union([t.string, t.null]),
    /** Source Entity Name. */
    name: t.union([t.string, t.null]),
    /** The risk source type */
    sourceType: t.union([OneTrustEntityType, t.null]),
    /** Source Entity Type. */
    type: t.union([
      t.literal('PIA'),
      t.literal('RA'),
      t.literal('GRA'),
      t.literal('INVENTORY'),
      t.literal('INCIDENT'),
      t.literal('GENERIC'),
      t.null,
    ]),
  }),
  /** Risk Source Type. */
  sourceType: t.union([
    t.literal('PIA'),
    t.literal('RA'),
    t.literal('GRA'),
    t.literal('INVENTORY'),
    t.literal('INCIDENT'),
    t.literal('GENERIC'),
    t.null,
  ]),
  /** The risk stage */
  stage: t.intersection([
    t.partial({
      /** The currentStageApprovers */
      currentStageApprovers: t.array(t.string),
      /** The badgeColor */
      badgeColor: t.union([t.string, t.null]),
    }),
    t.type({
      /** ID of an entity. */
      id: t.string,
      /** Name of an entity. */
      name: t.string,
      /** Name Key of the entity for translation. */
      nameKey: t.string,
    }),
  ]),
  /** The risk state */
  state: t.union([
    t.literal('IDENTIFIED'),
    t.literal('RECOMMENDATION_ADDED'),
    t.literal('RECOMMENDATION_SENT'),
    t.literal('REMEDIATION_PROPOSED'),
    t.literal('EXCEPTION_REQUESTED'),
    t.literal('REDUCED'),
    t.literal('RETAINED'),
    t.literal('ARCHIVED_IN_VERSION'),
  ]),
  /** The target risk level */
  targetRiskLevel: OneTrustRiskLevel,
  /** The risk threat */
  threat: t.union([
    t.type({
      /** Threat ID. */
      id: t.string,
      /** Threat Identifier. */
      identifier: t.string,
      /** Threat Name. */
      name: t.string,
    }),
    t.null,
  ]),
  /** Risk Treatment. */
  treatment: t.union([t.string, t.null]),
  /** Risk Treatment status. */
  treatmentStatus: t.union([
    t.literal('InProgress'),
    t.literal('UnderReview'),
    t.literal('ExceptionRequested'),
    t.literal('Approved'),
    t.literal('ExceptionGranted'),
    t.null,
  ]),
  /** Risk Type. */
  type: t.union([
    t.literal('ASSESSMENTS'),
    t.literal('ASSETS'),
    t.literal('PROCESSING_ACTIVITIES'),
    t.literal('VENDORS'),
    t.literal('ENTITIES'),
    t.literal('INCIDENTS'),
    t.literal('ENGAGEMENTS'),
    t.null,
  ]),
  /** ID of an assessment. */
  typeRefIds: t.array(t.string),
  /** List of vulnerabilities */
  vulnerabilities: t.union([
    t.array(
      t.type({
        /** Vulnerability ID. */
        id: t.string,
        /** Vulnerability Identifier. */
        identifier: t.string,
        /** Vulnerability Name. */
        name: t.string,
      }),
    ),
    t.null,
  ]),
  /** The risk workflow */
  workflow: t.intersection([
    t.type({
      /** ID of an entity. */
      id: t.string,
      /** Name of an entity. */
      name: t.string,
    }),
    t.partial({
      /** The name Key */
      nameKey: t.union([t.string, t.null]),
      /** The badgeColor */
      badgeColor: t.union([t.string, t.null]),
    }),
  ]),
});

/** Type override */
export type OneTrustGetRiskResponse = t.TypeOf<typeof OneTrustGetRiskResponse>;
/* eslint-enable max-lines */
