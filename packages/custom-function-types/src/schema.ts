import {
  DSR_DATAPOINT_CUSTOM_FUNCTION_PAYLOAD_SCHEMA,
  DSR_REQUEST_ENRICHER_CUSTOM_FUNCTION_PAYLOAD_SCHEMA,
  GENERAL_CUSTOM_FUNCTION_PAYLOAD_SCHEMA,
} from './__generated__/payloadSchemas.js';

/** JSON Schema object exported for editor and CLI validation. */
export interface CustomFunctionJsonSchema {
  /** JSON Schema property by keyword. */
  readonly [key: string]: unknown;
}

/** Payload schema variants supported by the Custom Function runtime. */
export const CustomFunctionSchemaType = {
  /** General or Rules Automation payload. */
  General: 'GENERAL',
  /** Default data subject request datapoint export. */
  DsrDataPoint: 'DSR_DATA_POINT',
  /** Data subject request `enricher` export. */
  DsrRequestEnricher: 'DSR_REQUEST_ENRICHER',
} as const;

/** Payload schema variant. */
export type CustomFunctionSchemaType =
  (typeof CustomFunctionSchemaType)[keyof typeof CustomFunctionSchemaType];

/** Generated schemas keyed by Custom Function payload variant. */
const CUSTOM_FUNCTION_PAYLOAD_SCHEMAS: Readonly<
  Record<CustomFunctionSchemaType, CustomFunctionJsonSchema>
> = {
  [CustomFunctionSchemaType.General]: GENERAL_CUSTOM_FUNCTION_PAYLOAD_SCHEMA,
  [CustomFunctionSchemaType.DsrDataPoint]: DSR_DATAPOINT_CUSTOM_FUNCTION_PAYLOAD_SCHEMA,
  [CustomFunctionSchemaType.DsrRequestEnricher]:
    DSR_REQUEST_ENRICHER_CUSTOM_FUNCTION_PAYLOAD_SCHEMA,
};

/**
 * Select the validation contract for a Custom Function payload variant.
 *
 * @param type - Function payload variant
 * @returns Generated draft-07 JSON Schema
 */
export function getCustomFunctionPayloadSchema(
  type: CustomFunctionSchemaType,
): CustomFunctionJsonSchema {
  return CUSTOM_FUNCTION_PAYLOAD_SCHEMAS[type];
}

export {
  DSR_DATAPOINT_CUSTOM_FUNCTION_PAYLOAD_SCHEMA,
  DSR_REQUEST_ENRICHER_CUSTOM_FUNCTION_PAYLOAD_SCHEMA,
  GENERAL_CUSTOM_FUNCTION_PAYLOAD_SCHEMA,
};
