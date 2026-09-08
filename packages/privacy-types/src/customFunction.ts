import { makeEnum } from '@transcend-io/type-utils';

/**
 * The product-facing type of a custom function.
 */
export const CustomFunctionType = makeEnum({
  /** DSR pre-flight enricher and datapoint resolver */
  Dsr: 'DSR',
  /** General purpose code execution */
  General: 'GENERAL',
});

/** Overload CustomFunctionType as a type */
export type CustomFunctionType = (typeof CustomFunctionType)[keyof typeof CustomFunctionType];

/**
 * The lifecycle state of a custom function.
 */
export const CustomFunctionLifecycleState = makeEnum({
  /** The function exists but has no active version */
  Inactive: 'INACTIVE',
  /** The function has an active version */
  Active: 'ACTIVE',
  /** The function is archived */
  Archived: 'ARCHIVED',
});

/** Overload CustomFunctionLifecycleState as a type */
export type CustomFunctionLifecycleState =
  (typeof CustomFunctionLifecycleState)[keyof typeof CustomFunctionLifecycleState];

/**
 * The lifecycle state of a custom function version.
 */
export const CustomFunctionVersionLifecycleState = makeEnum({
  /** The version is the function's active version */
  Active: 'ACTIVE',
  /** The version is a draft pending promotion */
  Draft: 'DRAFT',
  /** The version was superseded by a newer version */
  Inactive: 'INACTIVE',
});

/** Overload CustomFunctionVersionLifecycleState as a type */
export type CustomFunctionVersionLifecycleState =
  (typeof CustomFunctionVersionLifecycleState)[keyof typeof CustomFunctionVersionLifecycleState];

/**
 * The payload types a custom function can be invoked with, selecting which
 * export the runtime executes.
 */
export const CustomFunctionPayloadType = makeEnum({
  /** DSR datapoint resolver — invokes the `default` export */
  DataPoint: 'DATA_POINT',
  /** DSR pre-flight request enricher — invokes the `enricher` export */
  RequestEnricher: 'REQUEST_ENRICHER',
  /** General purpose (Maestro) custom function */
  Maestro: 'MAESTRO',
});

/** Overload CustomFunctionPayloadType as a type */
export type CustomFunctionPayloadType =
  (typeof CustomFunctionPayloadType)[keyof typeof CustomFunctionPayloadType];
