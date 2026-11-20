import { getAdminTools } from '@transcend-io/mcp-server-admin';
import type { ToolClients } from '@transcend-io/mcp-server-base';
import { getConsentTools } from '@transcend-io/mcp-server-consent';
import { getDSRTools } from '@transcend-io/mcp-server-dsr';
import { getInventoryTools } from '@transcend-io/mcp-server-inventory';
import { getPreferenceTools } from '@transcend-io/mcp-server-preferences';
import { getPrivacyCenterTools } from '@transcend-io/mcp-server-privacy-center';
import { getWorkflowTools } from '@transcend-io/mcp-server-workflows';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@transcend-io/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@transcend-io/sdk')>()),
  syncConfigurationToTranscend: vi.fn().mockResolvedValue({ success: true, errors: [] }),
}));

vi.mock('@transcend-io/mcp-server-base', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@transcend-io/mcp-server-base')>()),
  createGraphqlRequestClient: () => ({ marker: 'client' }),
}));

vi.mock('@transcend-io/mcp-server-base/transcend-yml', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@transcend-io/mcp-server-base/transcend-yml')>();
  return {
    ...actual,
    decodeYmlItems: vi.fn((_codec, items: unknown[]) => items),
    decodeYmlRecord: vi.fn((_codec, record: unknown) => record),
    pushYmlSection: vi.fn(async (_clients, _section, count) => ({
      success: true,
      count,
      errors: [],
    })),
  };
});

const clients = {
  rest: {} as never,
  graphql: {} as never,
  dashboardUrl: 'https://app.transcend.io',
} satisfies ToolClients;

const toolByName = (name: string) => {
  const all = [
    ...getAdminTools(clients),
    ...getConsentTools(clients),
    ...getDSRTools(clients),
    ...getInventoryTools(clients),
    ...getPreferenceTools(clients),
    ...getPrivacyCenterTools(clients),
    ...getWorkflowTools(clients),
  ];
  return all.find((tool) => tool.name === name)!;
};

const sectionWrites: [string, Record<string, unknown>][] = [
  ['admin_write_teams', { teams: [{ name: 'Legal', description: 'd' }] }],
  ['consent_write_sites', { sites: [{ host: 'example.com' }] }],
  ['consent_write_purposes', { purposes: [{ trackingType: 'Advertising' }] }],
  ['consent_write_consent_manager', { consentManager: { domains: ['example.com'] } }],
  ['dsr_write_actions', { actions: [{ type: 'access', waitingPeriod: 0 }] }],
  ['dsr_write_enrichers', { enrichers: [{ title: 'Enrich', 'output-identifiers': ['email'] }] }],
  [
    'inventory_write_business_entities',
    { businessEntities: [{ title: 'Entity', description: 'd' }] },
  ],
  ['inventory_write_custom_fields', { attributes: [{ name: 'tier' }] }],
  ['inventory_write_data_subjects', { dataSubjects: [{ type: 'customer', title: 'Customer' }] }],
  ['inventory_write_identifiers', { identifiers: [{ name: 'email', type: 'email' }] }],
  [
    'inventory_write_processing_activities',
    { processingActivities: [{ title: 'Marketing', description: 'd' }] },
  ],
  ['preferences_write_option_values', { optionValues: [{ partition: 'default', slug: 'x' }] }],
  ['preferences_write_partitions', { partitions: [{ title: 'default' }] }],
  [
    'preferences_write_workflow_configs',
    { workflowConfigs: [{ title: 'Opt out', 'action-type': 'OPT_OUT' }] },
  ],
  ['privacy_center_write', { privacyCenter: { showPolicies: true } }],
  ['privacy_center_write_intl_messages', { messages: [{ id: 'greeting' }] }],
  ['privacy_center_write_policies', { policies: [{ title: 'Privacy', content: '<p>x</p>' }] }],
  ['workflows_write_email_templates', { templates: [{ title: 'Hello' }] }],
];

describe('yml section write tools', () => {
  it.each(sectionWrites)('%s returns success, count, and errors', async (name, args) => {
    const result = await toolByName(name).handler(args);
    expect(result).toMatchObject({
      success: expect.any(Boolean),
      count: expect.any(Number),
      errors: expect.any(Array),
    });
  });
});
