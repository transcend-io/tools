/* eslint-disable @typescript-eslint/no-explicit-any, require-await */
import { IsoCountryCode, RequestAction } from '@transcend-io/privacy-types';
import type { GraphQLClient } from 'graphql-request';
import { describe, it, expect, vi } from 'vitest';

import { syncWorkflowConfigs, type WorkflowConfigSyncInput } from '../syncWorkflowConfigs.js';

/** Minimal silent logger that captures errors */
function makeLogger(): {
  /** Logger stub */
  logger: any;
  /** Captured error messages */
  errors: string[];
} {
  const errors: string[] = [];
  return {
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn((msg: string) => errors.push(msg)),
      debug: vi.fn(),
    },
    errors,
  };
}

/** A DSR workflow config node as returned by the `workflows` query */
const DSR_CONFIG = {
  id: 'wf_1',
  title: { defaultMessage: 'Access Request' },
  subtitle: null,
  description: null,
  internalName: 'customer-access-workflow',
  workflowConfigVisibility: 'PUBLISHED',
  workflowConfigType: 'DSR',
  collectDataSubjectRegions: null,
  regionList: [],
  expiryTime: null,
  action: { type: 'ACCESS' },
  subject: null,
  WorkflowConfigAttributeKeys: null,
};

/** A preference-management workflow config node */
const PM_CONFIG = {
  ...DSR_CONFIG,
  id: 'wf_2',
  internalName: 'pm-workflow',
  workflowConfigType: 'PREFERENCE_MANAGEMENT',
};

/**
 * Build a stub GraphQLClient that dispatches on operation name.
 *
 * @param configs - Workflow config nodes to return from the `workflows` query
 * @returns Client stub and captured updateWorkflowConfig mutation inputs
 */
function makeClientStub(configs: any[]): {
  /** GraphQLClient-shaped stub */
  client: GraphQLClient;
  /** Captured updateWorkflowConfig inputs */
  updateInputs: any[];
} {
  const updateInputs: any[] = [];
  const client = {
    request: vi.fn(async (document: any, variables: any) => {
      // Documents may be raw gql strings or parsed DocumentNodes
      const operationName =
        typeof document === 'string'
          ? /(?:query|mutation)\s+(\w+)/.exec(document)?.[1]
          : document.definitions[0].name.value;
      switch (operationName) {
        case 'TranscendCliWorkflowConfigs':
          return { workflows: { nodes: configs, totalCount: configs.length } };
        case 'TranscendCliActions':
          return { actions: { nodes: [{ id: 'action_1', type: 'ACCESS' }] } };
        case 'TranscendCliUpdateWorkflowConfig':
          updateInputs.push(variables.input);
          return { updateWorkflowConfig: { success: true } };
        default:
          throw new Error(`Unexpected operation: ${operationName}`);
      }
    }),
  } as unknown as GraphQLClient;
  return { client, updateInputs };
}

const BASE_INPUT: WorkflowConfigSyncInput = {
  'internal-name': 'customer-access-workflow',
  'action-type': RequestAction.Access,
};

describe('syncWorkflowConfigs', () => {
  it('updates a matched DSR config on the happy path', async () => {
    const { client, updateInputs } = makeClientStub([DSR_CONFIG]);
    const { logger } = makeLogger();

    const result = await syncWorkflowConfigs(client, [{ ...BASE_INPUT, subtitle: 'Updated' }], {
      logger,
    });

    expect(result).toBe(true);
    expect(updateInputs).toHaveLength(1);
    expect(updateInputs[0]).toMatchObject({
      workflowConfigId: 'wf_1',
      actionType: 'ACCESS',
      subtitle: 'Updated',
    });
  });

  it('fails when no config matches the internal name', async () => {
    const { client, updateInputs } = makeClientStub([DSR_CONFIG]);
    const { logger, errors } = makeLogger();

    const result = await syncWorkflowConfigs(
      client,
      [{ ...BASE_INPUT, 'internal-name': 'does-not-exist-cli-test' }],
      { logger },
    );

    expect(result).toBe(false);
    expect(updateInputs).toHaveLength(0);
    expect(errors.join('\n')).toMatch(/must be created in the Admin Dashboard/);
  });

  it('fails when the matched config is not a DSR workflow', async () => {
    const { client, updateInputs } = makeClientStub([PM_CONFIG]);
    const { logger, errors } = makeLogger();

    const result = await syncWorkflowConfigs(
      client,
      [{ ...BASE_INPUT, 'internal-name': 'pm-workflow' }],
      { logger },
    );

    expect(result).toBe(false);
    expect(updateInputs).toHaveLength(0);
    expect(errors.join('\n')).toMatch(/Only DSR workflow configs can be synced/);
  });

  it('fails when expiry-time has no default region entry', async () => {
    const { client, updateInputs } = makeClientStub([DSR_CONFIG]);
    const { logger, errors } = makeLogger();

    const result = await syncWorkflowConfigs(
      client,
      [
        {
          ...BASE_INPUT,
          'expiry-time': [{ region: IsoCountryCode.CA, value: 30 }],
        },
      ],
      { logger },
    );

    expect(result).toBe(false);
    expect(updateInputs).toHaveLength(0);
    expect(errors.join('\n')).toMatch(/`region: default` entry is required/);
  });

  it('fails when expiry-time has a non-positive value', async () => {
    const { client, updateInputs } = makeClientStub([DSR_CONFIG]);
    const { logger, errors } = makeLogger();

    const result = await syncWorkflowConfigs(
      client,
      [
        {
          ...BASE_INPUT,
          'expiry-time': [
            { region: 'default', value: 45 },
            { region: IsoCountryCode.CA, value: 0 },
          ],
        },
      ],
      { logger },
    );

    expect(result).toBe(false);
    expect(updateInputs).toHaveLength(0);
    expect(errors.join('\n')).toMatch(/must be greater than 0 days/);
  });

  it('fails when multiple configs share the internal name', async () => {
    const { client, updateInputs } = makeClientStub([DSR_CONFIG, { ...DSR_CONFIG, id: 'wf_3' }]);
    const { logger, errors } = makeLogger();

    const result = await syncWorkflowConfigs(client, [BASE_INPUT], { logger });

    expect(result).toBe(false);
    expect(updateInputs).toHaveLength(0);
    expect(errors.join('\n')).toMatch(/Internal names must be unique/);
  });
});
/* eslint-enable @typescript-eslint/no-explicit-any, require-await */
