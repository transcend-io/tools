/** Category for MCP feature requests filed from signed-in clients. */
export const McpFeatureRequestCategory = {
  MissingTool: 'MISSING_TOOL',
  MissingField: 'MISSING_FIELD',
  MissingFilter: 'MISSING_FILTER',
  Other: 'OTHER',
} as const;

export type McpFeatureRequestCategory =
  (typeof McpFeatureRequestCategory)[keyof typeof McpFeatureRequestCategory];
