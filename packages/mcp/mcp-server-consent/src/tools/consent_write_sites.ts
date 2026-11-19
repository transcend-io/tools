import {
  createGraphqlRequestClient,
  createToolResult,
  defineTool,
  ErrorCode,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import { syncConsentSites } from '@transcend-io/sdk';

export const WriteSiteItemSchema = z.object({
  host: z
    .string()
    .min(1)
    .describe('Host of the site, for example app.example.com. Used as the key.'),
  site: z
    .string()
    .optional()
    .describe(
      'Top-level domain (eTLD+1), for example example.com. Inferred from the host if omitted.',
    ),
  description: z.string().optional().describe('What this site or app is'),
  owners: z.array(z.string()).optional().describe('Owner email addresses'),
  teams: z.array(z.string()).optional().describe('Names of existing teams that manage this site'),
  attributes: z
    .array(
      z.object({
        key: z.string().describe('Attribute key name'),
        values: z.array(z.string()).describe('Values for the key'),
      }),
    )
    .optional()
    .describe('Custom attribute values'),
});
export type WriteSiteItemInput = z.infer<typeof WriteSiteItemSchema>;

export const WriteSitesSchema = z.object({
  sites: z
    .array(WriteSiteItemSchema)
    .min(1)
    .max(100)
    .refine((sites) => new Set(sites.map(({ host }) => host)).size === sites.length, {
      message: 'Each host may appear only once',
    })
    .describe(
      'Sites to create or update, matched by host, like the consent-sites section of ' +
        'transcend.yml. Use consent_list_sites for current values.',
    ),
});
export type WriteSitesInput = z.infer<typeof WriteSitesSchema>;

export function createConsentWriteSitesTool(clients: ToolClients) {
  return defineTool({
    name: 'consent_write_sites',
    description:
      'Create or update consent sites (domains, hosts, websites and apps) in Airgap, like the ' +
      'consent-sites section of transcend.yml. Sets description, owner emails, team names and ' +
      'attributes per host. Hosts not in the list are not deleted.',
    category: 'Consent Management',
    readOnly: false,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: WriteSitesSchema,
    handler: async ({ sites }) => {
      const errors: string[] = [];
      const success = await syncConsentSites(createGraphqlRequestClient(clients.graphql), sites, {
        logger: {
          info: () => {},
          warn: () => {},
          debug: () => {},
          error: (...args: unknown[]) => {
            errors.push(args.map(String).join(' '));
          },
        },
      });
      if (!success) {
        return createToolResult(
          false,
          undefined,
          errors.join('; ') || 'Failed to sync consent sites',
          {
            code: ErrorCode.API_ERROR,
            retryable: false,
            details: { hosts: sites.map(({ host }) => host) },
          },
        );
      }
      return createToolResult(true, {
        written: sites.length,
        hosts: sites.map(({ host }) => host),
      });
    },
  });
}
