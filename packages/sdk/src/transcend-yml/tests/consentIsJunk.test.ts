import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { ConsentTrackerStatus, DataFlowScope } from '@transcend-io/privacy-types';
import { buildSchema, parse, validate } from 'graphql';
import type { GraphQLClient } from 'graphql-request';
import { describe, expect, it } from 'vitest';

import { COOKIES, UPDATE_OR_CREATE_COOKIES } from '../../consent/gqls/cookies.js';
import { CREATE_DATA_FLOWS, DATA_FLOWS, UPDATE_DATA_FLOWS } from '../../consent/gqls/dataFlows.js';
import { TranscendInput } from '../codecs.js';
import { TranscendPullResource } from '../enums.js';
import { pullTranscendConfiguration } from '../pullTranscendConfiguration.js';
import { syncConfigurationToTranscend } from '../syncConfigurationToTranscend.js';

/** A tracker row as returned by the fake backend */
interface FakeTracker {
  /** Row ID */
  id: string;
  /** Data flow value or cookie name */
  key: string;
  /** Status */
  status: ConsentTrackerStatus;
  /** Whether junk */
  isJunk: boolean;
}

/** Operations the fake client recorded */
interface Recorded {
  /** Variables sent to createDataFlows */
  createDataFlows: { dataFlows: Record<string, unknown>[] }[];
  /** Variables sent to updateDataFlows */
  updateDataFlows: { dataFlows: Record<string, unknown>[] }[];
  /** Variables sent to updateOrCreateCookies */
  updateOrCreateCookies: { cookies: Record<string, unknown>[] }[];
}

/**
 * Build a fake client backed by static data flow and cookie rows.
 *
 * @param rows - Existing rows
 * @returns The client and the recorded mutations
 */
function buildFakeClient(rows: {
  /** Existing data flows */
  dataFlows?: FakeTracker[];
  /** Existing cookies */
  cookies?: FakeTracker[];
}): {
  /** The client */
  client: GraphQLClient;
  /** Recorded mutations */
  recorded: Recorded;
} {
  const recorded: Recorded = {
    createDataFlows: [],
    updateDataFlows: [],
    updateOrCreateCookies: [],
  };
  const request = async (document: unknown, variables: unknown): Promise<unknown> => {
    const doc = String(document);
    const vars = variables as Record<string, any>;
    if (doc.includes('TranscendCliFetchConsentManagerId')) {
      return { consentManager: { consentManager: { id: 'bundle-1' } } };
    }
    if (doc.includes('TranscendCliDataFlows(')) {
      const nodes = (rows.dataFlows ?? [])
        .filter((row) => row.status === vars.filterBy.status)
        .map((row) => ({
          id: row.id,
          value: row.key,
          type: DataFlowScope.Host,
          trackingType: [],
          status: row.status,
          isJunk: row.isJunk,
          owners: [],
          teams: [],
          attributeValues: [],
        }));
      return { dataFlows: { nodes: vars.offset === 0 ? nodes : [], totalCount: nodes.length } };
    }
    if (doc.includes('TranscendCliCookies(')) {
      const nodes = (rows.cookies ?? [])
        .filter((row) => row.status === vars.filterBy.status)
        .map((row) => ({
          id: row.id,
          name: row.key,
          isRegex: false,
          trackingPurposes: [],
          status: row.status,
          isJunk: row.isJunk,
          owners: [],
          teams: [],
          attributeValues: [],
        }));
      return { cookies: { nodes: vars.offset === 0 ? nodes : [], totalCount: nodes.length } };
    }
    if (doc.includes('TranscendCliCreateDataFlows')) {
      recorded.createDataFlows.push(vars as Recorded['createDataFlows'][number]);
      return { createDataFlows: { dataFlows: [] } };
    }
    if (doc.includes('TranscendCliUpdateDataFlows')) {
      recorded.updateDataFlows.push(vars as Recorded['updateDataFlows'][number]);
      return { updateDataFlows: { dataFlows: [] } };
    }
    if (doc.includes('TranscendCliUpdateOrCreateCookies')) {
      recorded.updateOrCreateCookies.push(vars as Recorded['updateOrCreateCookies'][number]);
      return { updateOrCreateCookies: { clientMutationId: null } };
    }
    throw new Error(`Unexpected GraphQL document: ${doc}`);
  };
  return { client: { request } as unknown as GraphQLClient, recorded };
}

describe('isJunk on data-flows and cookies', () => {
  it('decodes isJunk as an optional boolean', () => {
    const decoded = TranscendInput.decode({
      'data-flows': [
        { value: 'junk.example.com', type: DataFlowScope.Host, isJunk: true },
        { value: 'plain.example.com', type: DataFlowScope.Host },
      ],
      cookies: [{ name: '_junk', isJunk: true }, { name: '_plain' }],
    });
    expect(decoded._tag).toBe('Right');
    expect(
      TranscendInput.decode({
        'data-flows': [{ value: 'a.example.com', type: DataFlowScope.Host, isJunk: 'yes' }],
      })._tag,
    ).toBe('Left');
    expect(TranscendInput.decode({ cookies: [{ name: '_a', isJunk: 'yes' }] })._tag).toBe('Left');
  });

  it('uses GraphQL operations that are valid against the schema', () => {
    const schema = buildSchema(
      readFileSync(
        fileURLToPath(new URL('../../../../../schema.graphql', import.meta.url)),
        'utf8',
      ),
    );
    [DATA_FLOWS, CREATE_DATA_FLOWS, UPDATE_DATA_FLOWS, COOKIES, UPDATE_OR_CREATE_COOKIES].forEach(
      (document) => {
        expect(validate(schema, parse(String(document)))).toEqual([]);
      },
    );
  });

  it('sends isJunk when creating and updating data flows', async () => {
    const { client, recorded } = buildFakeClient({
      dataFlows: [
        {
          id: 'df-1',
          key: 'existing.example.com',
          status: ConsentTrackerStatus.Live,
          isJunk: false,
        },
      ],
    });

    const result = await syncConfigurationToTranscend(
      {
        'data-flows': [
          {
            value: 'existing.example.com',
            type: DataFlowScope.Host,
            status: ConsentTrackerStatus.Live,
            isJunk: true,
          },
          {
            value: 'new.example.com',
            type: DataFlowScope.Host,
            status: ConsentTrackerStatus.Live,
            isJunk: true,
          },
          { value: 'unset.example.com', type: DataFlowScope.Host },
        ],
      },
      client,
      {},
    );

    expect(result.success).toBe(true);
    const created = recorded.createDataFlows.flatMap(({ dataFlows }) => dataFlows);
    expect(created.map(({ value, isJunk }) => [value, isJunk])).toEqual([
      ['new.example.com', true],
      ['unset.example.com', undefined],
    ]);
    const updated = recorded.updateDataFlows.flatMap(({ dataFlows }) => dataFlows);
    expect(updated).toEqual([
      expect.objectContaining({
        id: 'df-1',
        value: 'existing.example.com',
        status: ConsentTrackerStatus.Live,
        isJunk: true,
      }),
    ]);
  });

  it('sends isJunk when upserting cookies', async () => {
    const { client, recorded } = buildFakeClient({});

    const result = await syncConfigurationToTranscend(
      {
        cookies: [
          { name: '_junk', status: ConsentTrackerStatus.Live, isJunk: true },
          { name: '_plain' },
        ],
      },
      client,
      {},
    );

    expect(result.success).toBe(true);
    const sent = recorded.updateOrCreateCookies.flatMap(({ cookies }) => cookies);
    expect(sent.map(({ name, isJunk }) => [name, isJunk])).toEqual([
      ['_junk', true],
      ['_plain', undefined],
    ]);
  });

  it('pulls junk rows with isJunk true and never emits isJunk false', async () => {
    const { client } = buildFakeClient({
      dataFlows: [
        { id: 'df-1', key: 'junk.example.com', status: ConsentTrackerStatus.Live, isJunk: true },
        { id: 'df-2', key: 'plain.example.com', status: ConsentTrackerStatus.Live, isJunk: false },
        {
          id: 'df-3',
          key: 'review.example.com',
          status: ConsentTrackerStatus.NeedsReview,
          isJunk: false,
        },
      ],
      cookies: [
        { id: 'c-1', key: '_junk', status: ConsentTrackerStatus.Live, isJunk: true },
        { id: 'c-2', key: '_plain', status: ConsentTrackerStatus.Live, isJunk: false },
      ],
    });

    const result = await pullTranscendConfiguration(client, {
      dataSiloIds: [],
      integrationNames: [],
      debug: false,
      pageSize: 50,
      resources: [TranscendPullResource.DataFlows, TranscendPullResource.Cookies],
    });

    const flows = Object.fromEntries(
      (result['data-flows'] ?? []).map((flow) => [flow.value, flow]),
    );
    expect(Object.keys(flows).sort()).toEqual([
      'junk.example.com',
      'plain.example.com',
      'review.example.com',
    ]);
    expect(flows['junk.example.com']?.isJunk).toBe(true);
    expect(flows['plain.example.com']).not.toHaveProperty('isJunk', false);
    expect(flows['plain.example.com']?.isJunk).toBeUndefined();
    expect(flows['review.example.com']?.isJunk).toBeUndefined();

    const cookies = Object.fromEntries(
      (result.cookies ?? []).map((cookie) => [cookie.name, cookie]),
    );
    expect(cookies._junk?.isJunk).toBe(true);
    expect(cookies._plain).not.toHaveProperty('isJunk', false);
    expect(cookies._plain?.isJunk).toBeUndefined();
  });

  it('round trips a junk row through pull then push', async () => {
    const source = buildFakeClient({
      dataFlows: [
        { id: 'df-1', key: 'junk.example.com', status: ConsentTrackerStatus.Live, isJunk: true },
      ],
      cookies: [{ id: 'c-1', key: '_junk', status: ConsentTrackerStatus.Live, isJunk: true }],
    });
    const pulled = await pullTranscendConfiguration(source.client, {
      dataSiloIds: [],
      integrationNames: [],
      debug: false,
      pageSize: 50,
      resources: [TranscendPullResource.DataFlows, TranscendPullResource.Cookies],
    });

    const target = buildFakeClient({});
    const result = await syncConfigurationToTranscend(pulled, target.client, {});

    expect(result.success).toBe(true);
    expect(
      target.recorded.createDataFlows.flatMap(({ dataFlows }) => dataFlows).map((f) => f.isJunk),
    ).toEqual([true]);
    expect(
      target.recorded.updateOrCreateCookies.flatMap(({ cookies }) => cookies).map((c) => c.isJunk),
    ).toEqual([true]);
  });
});
