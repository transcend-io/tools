import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import {
  DataCategoryType,
  DefaultPurposeSubCategoryType,
  ProcessingPurpose,
} from '@transcend-io/privacy-types';

import type { InventoryMixin } from '../graphql.js';

const PurposeAssignmentSchema = z.object({
  purpose: z
    .nativeEnum(ProcessingPurpose)
    .describe('Processing purpose enum (e.g. ESSENTIAL, ANALYTICS)'),
  name: z
    .string()
    .optional()
    .describe(
      `Processing purpose subcategory name (defaults to "${DefaultPurposeSubCategoryType.Other}")`,
    ),
});

const CategoryAssignmentSchema = z.object({
  category: z.nativeEnum(DataCategoryType).describe('Data category type (e.g. CONTACT, ID)'),
  name: z.string().describe('Data subcategory name (e.g. "Email", "Other")'),
});

const SubDataPointInputSchema = z.object({
  name: z.string().describe('Field name / key within the datapoint'),
  description: z.string().optional().describe('Field description'),
  purposes: z
    .array(PurposeAssignmentSchema)
    .optional()
    .describe('Purpose of processing assignments for this field'),
  categories: z
    .array(CategoryAssignmentSchema)
    .optional()
    .describe('Data category assignments for this field'),
});

export const UpdateOrCreateDataPointSchema = z.object({
  dataSiloId: z.string().describe('ID of the parent data silo'),
  name: z.string().describe('Datapoint key / name (upsert key within the data silo)'),
  title: z.string().optional().describe('Display title for the datapoint'),
  description: z.string().optional().describe('Datapoint description'),
  ownerEmails: z.array(z.string()).optional().describe('Owner email addresses'),
  teamNames: z.array(z.string()).optional().describe('Team names'),
  path: z.array(z.string()).optional().describe('Optional nested path segments'),
  subDataPoints: z
    .array(SubDataPointInputSchema)
    .optional()
    .describe(
      'Field-level sub-data points. Purpose of processing is assigned here as ' +
        '`purposes: [{ purpose, name }]`.',
    ),
});
export type UpdateOrCreateDataPointInput = z.infer<typeof UpdateOrCreateDataPointSchema>;

export function createInventoryUpdateOrCreateDataPointTool(clients: ToolClients) {
  const graphql = clients.graphql as InventoryMixin;
  return defineTool({
    name: 'inventory_update_or_create_data_point',
    description:
      'Create or update a datapoint (and its fields / sub-data points) on a data silo. ' +
      'Use this to assign purpose of processing on fields via `subDataPoints[].purposes` ' +
      `(\`{ purpose, name }\`, name defaults to "${DefaultPurposeSubCategoryType.Other}"). ` +
      'Mirrors GraphQL updateOrCreateDataPoint.',
    category: 'Data Inventory',
    readOnly: false,
    confirmationHint: 'Creates or updates a datapoint and its field purpose assignments',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: UpdateOrCreateDataPointSchema,
    handler: async ({
      dataSiloId,
      name,
      title,
      description,
      ownerEmails,
      teamNames,
      path,
      subDataPoints,
    }) => {
      const result = await graphql.updateOrCreateDataPoint({
        dataSiloId,
        name,
        title,
        description,
        ownerEmails,
        teamNames,
        path,
        subDataPoints: subDataPoints?.map((field) => ({
          name: field.name,
          description: field.description,
          purposes: field.purposes?.map((p) => ({
            purpose: p.purpose,
            name: p.name || DefaultPurposeSubCategoryType.Other,
          })),
          categories: field.categories?.map((c) => ({
            category: c.category,
            name: c.name,
          })),
        })),
      });
      return createToolResult(true, {
        dataPoint: result,
        message: 'Data point upserted successfully',
      });
    },
  });
}
