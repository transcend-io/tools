import { createListResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import { TRANSCEND_SCOPES } from '@transcend-io/privacy-types';

export const ListScopesSchema = z.object({
  text: z
    .string()
    .optional()
    .describe('Case-insensitive filter over scope name, title, and description.'),
  includeDetails: z
    .boolean()
    .optional()
    .default(false)
    .describe('When true, add description and products. Default false returns compact rows.'),
});
export type ListScopesInput = z.infer<typeof ListScopesSchema>;

export function createAdminListScopesTool(_clients?: ToolClients) {
  return defineTool({
    name: 'admin_list_scopes',
    description:
      'List valid ScopeName values for admin_create_api_key. Default rows are compact ' +
      '(name, title, type, dependencies). Filter with text; set includeDetails only when titles are not enough.',
    category: 'Admin',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListScopesSchema,
    handler: async ({ text, includeDetails }) => {
      const needle = text?.trim().toLowerCase();
      const rows = Object.entries(TRANSCEND_SCOPES)
        .filter(([name, def]) => {
          if (!needle) return true;
          return (
            name.toLowerCase().includes(needle) ||
            def.title.toLowerCase().includes(needle) ||
            def.description.toLowerCase().includes(needle)
          );
        })
        .map(([name, def]) =>
          includeDetails
            ? {
                name,
                title: def.title,
                type: def.type,
                dependencies: def.dependencies,
                description: def.description,
                products: def.products,
              }
            : {
                name,
                title: def.title,
                type: def.type,
                dependencies: def.dependencies,
              },
        );

      return createListResult(rows, { totalCount: rows.length });
    },
  });
}
