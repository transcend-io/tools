import type { ToolClients } from '@transcend-io/mcp-server-base';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  pull: vi.fn(),
  sync: vi.fn(),
}));

vi.mock('@transcend-io/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@transcend-io/sdk')>()),
  pullTranscendConfiguration: sdk.pull,
  syncConfigurationToTranscend: sdk.sync,
}));

vi.mock('@transcend-io/mcp-server-base/transcend-yml', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@transcend-io/mcp-server-base/transcend-yml')>();
  return {
    ...actual,
    pushYmlSection: vi.fn(
      async (
        _clients: unknown,
        section: Record<string, unknown>,
        count: number,
        options?: { publishToPrivacyCenter?: boolean },
      ) => {
        try {
          const result = await sdk.sync(
            section,
            { marker: 'client' },
            { publishToPrivacyCenter: false, ...options },
          );
          return {
            success: result.success,
            count,
            errors: result.errors ?? [],
            ...(result.logs && { logs: result.logs }),
          };
        } catch (error) {
          return {
            success: false,
            count,
            errors: [
              {
                resource: Object.keys(section).join(','),
                message: error instanceof Error ? error.message : String(error),
              },
            ],
            logs: [],
          };
        }
      },
    ),
    listAllYmlSection: vi.fn(async () => {
      const config = (await sdk.pull({ marker: 'client' }, { resources: [] })) as Record<
        string,
        unknown
      >;
      const items = Object.values(config).find((value) => Array.isArray(value)) as unknown[];
      return { data: items ?? [], totalCount: items?.length ?? 0, hasNextPage: false };
    }),
  };
});

const { getInventoryTools, INVENTORY_OAUTH_SCOPES } = await import('../src/index.js');
const { ScopeName } = await import('@transcend-io/privacy-types');
const { TranscendPullResource, TR_PULL_RESOURCE_SCOPE_MAP, TR_PUSH_RESOURCE_SCOPE_MAP } =
  await import('@transcend-io/sdk');

const clients = {
  rest: {} as never,
  graphql: {} as never,
  dashboardUrl: 'https://app.transcend.io',
} satisfies ToolClients;

const tools = getInventoryTools(clients);
const tool = (name: string) => tools.find((t) => t.name === name)!;

const WRITE_CASES = [
  {
    name: 'inventory_write_business_entities',
    field: 'business-entities',
    arg: 'businessEntities',
    item: { title: 'Acme EU', headquarterCountry: 'DE' },
  },
  {
    name: 'inventory_write_data_subjects',
    field: 'data-subjects',
    arg: 'dataSubjects',
    item: { type: 'customer', active: true },
  },
  {
    name: 'inventory_write_identifiers',
    field: 'identifiers',
    arg: 'identifiers',
    item: { name: 'email', type: 'email' },
  },
  {
    name: 'inventory_write_processing_activities',
    field: 'processing-activities',
    arg: 'processingActivities',
    item: { title: 'Billing', dataSubjectTypes: ['customer'] },
  },
  {
    name: 'inventory_write_custom_fields',
    field: 'attributes',
    arg: 'attributes',
    item: { name: 'Region', type: 'SINGLE_SELECT', values: [{ name: 'EU' }] },
  },
] as const;

describe.each(WRITE_CASES)('$name', ({ name, field, arg, item }) => {
  beforeEach(() => {
    sdk.sync.mockReset();
    sdk.sync.mockResolvedValue({ success: true, errors: [] });
  });

  it('is an idempotent, non-destructive write without a confirmation gate', () => {
    expect(tool(name).readOnly).toBe(false);
    expect(tool(name).annotations).toMatchObject({
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
    });
    expect(tool(name).confirmation).toBeUndefined();
  });

  it('syncs only its own section and returns a compact result', async () => {
    const result = await tool(name).handler({ [arg]: [item] });

    expect(result).toEqual({ success: true, count: 1, errors: [] });
    const [input, client, options] = sdk.sync.mock.calls[0]! as [
      Record<string, unknown>,
      { marker: string },
      { publishToPrivacyCenter: boolean },
    ];
    expect(Object.keys(input)).toEqual([field]);
    expect(input[field]).toEqual([item]);
    expect(client).toEqual({ marker: 'client' });
    expect(options).toMatchObject({ publishToPrivacyCenter: false });
  });

  it('rejects an empty items array', () => {
    expect(tool(name).zodSchema.safeParse({ [arg]: [] }).success).toBe(false);
  });

  it('rejects an item the yml codec rejects, before calling the SDK', async () => {
    await expect(tool(name).handler({ [arg]: [{ nope: true }] })).rejects.toThrow(
      new RegExp(`${field}\\[0\\]`),
    );
    expect(sdk.sync).not.toHaveBeenCalled();
  });

  it('surfaces sync errors and logs', async () => {
    sdk.sync.mockResolvedValue({
      success: false,
      errors: [{ resource: field, message: 'boom' }],
      logs: [{ level: 'error', message: 'detail' }],
    });
    const result = (await tool(name).handler({ [arg]: [item] })) as {
      success: boolean;
      errors: unknown[];
      logs: unknown[];
    };
    expect(result.success).toBe(false);
    expect(result.errors).toEqual([{ resource: field, message: 'boom' }]);
    expect(result.logs).toHaveLength(1);
  });

  it('reports a thrown SDK error instead of throwing', async () => {
    sdk.sync.mockRejectedValue(new Error('Failed to find data subject'));
    const result = (await tool(name).handler({ [arg]: [item] })) as {
      success: boolean;
      errors: { message: string }[];
    };
    expect(result.success).toBe(false);
    expect(result.errors[0]!.message).toBe('Failed to find data subject');
  });
});

describe.each([
  {
    name: 'inventory_list_processing_activities',
    resource: TranscendPullResource.ProcessingActivities,
    field: 'processing-activities',
  },
  {
    name: 'inventory_list_custom_fields',
    resource: TranscendPullResource.Attributes,
    field: 'attributes',
  },
])('$name', ({ name, resource, field }) => {
  beforeEach(() => {
    sdk.pull.mockReset();
  });

  it('is read-only', () => {
    expect(tool(name).readOnly).toBe(true);
    expect(tool(name).annotations).toMatchObject({ readOnlyHint: true, idempotentHint: true });
  });

  it('pulls only its own section', async () => {
    sdk.pull.mockResolvedValue({ [field]: [{ title: 'A', name: 'A' }] });
    const result = (await tool(name).handler({})) as { data: unknown[] };

    expect(sdk.pull).toHaveBeenCalled();
    expect(JSON.stringify(result)).toContain('"title":"A"');
  });

  it('returns an empty list when the section is absent', async () => {
    sdk.pull.mockResolvedValue({});
    const result = await tool(name).handler({});
    expect(JSON.stringify(result)).toContain('[]');
  });
});

describe('scopes', () => {
  it('covers the CLI pull and push scopes for every section these tools handle', () => {
    const resources = [
      TranscendPullResource.BusinessEntities,
      TranscendPullResource.DataSubjects,
      TranscendPullResource.Identifiers,
      TranscendPullResource.ProcessingActivities,
      TranscendPullResource.Attributes,
    ];
    const needed = resources.flatMap((resource) => [
      ...TR_PULL_RESOURCE_SCOPE_MAP[resource],
      ...TR_PUSH_RESOURCE_SCOPE_MAP[resource],
    ]);
    for (const scope of needed) {
      expect(INVENTORY_OAUTH_SCOPES).toContain(scope);
    }
    expect(INVENTORY_OAUTH_SCOPES).toContain(ScopeName.ManageGlobalAttributes);
  });
});
