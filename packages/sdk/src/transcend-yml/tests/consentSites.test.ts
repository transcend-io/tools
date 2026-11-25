import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { buildSchema, parse, validate } from 'graphql';
import type { GraphQLClient } from 'graphql-request';
import { describe, expect, it } from 'vitest';

import { CONSENT_SITES, CREATE_OR_UPDATE_CONSENT_SITES } from '../../consent/gqls/consentSites.js';
import { TranscendInput } from '../codecs.js';
import { TR_PULL_RESOURCE_SCOPE_MAP, TR_PUSH_RESOURCE_SCOPE_MAP } from '../constants.js';
import { TranscendPullResource } from '../enums.js';
import { pullTranscendConfiguration } from '../pullTranscendConfiguration.js';
import { syncConfigurationToTranscend } from '../syncConfigurationToTranscend.js';

/** A consent host as stored by the fake backend */
interface FakeHost {
  /** Host ID */
  id: string;
  /** Host */
  host: string;
  /** eTLD+1 */
  site: string;
  /** Description */
  description: string | null;
  /** Included in metadata */
  includeInMetadata: boolean;
  /** Deleted at */
  deletedAt: string | null;
  /** Owners */
  owners: { id: string; name: string; email: string }[];
  /** Teams */
  teams: { id: string; name: string }[];
  /** Attribute values */
  attributeValues: {
    /** Value ID */
    id: string;
    /** Value name */
    name: string;
    /** Key */
    attributeKey: { id: string; name: string };
  }[];
}

/** Variables sent to the bulk upsert mutation */
interface UpsertVariables {
  /** Bundle ID */
  airgapBundleId: string;
  /** Sites to upsert */
  sites: {
    /** Host */
    host: string;
    /** Site */
    site?: string;
    /** Description */
    description?: string;
    /** Included in metadata */
    includeInMetadata?: boolean;
    /** Owner emails */
    ownerEmails?: string[];
    /** Team names */
    teamNames?: string[];
    /** Attributes */
    attributes?: { key: string; values: string[] }[];
  }[];
}

/**
 * Build a GraphQL client backed by an in-memory consent sites table.
 *
 * @param hosts - Initial hosts
 * @returns The fake client and the recorded mutation variables
 */
function buildFakeClient(
  hosts: FakeHost[],
  options: {
    /** Make the upsert mutation fail */
    failMutation?: boolean;
  } = {},
): {
  /** The client */
  client: GraphQLClient;
  /** Mutation variables seen so far */
  upserts: UpsertVariables[];
  /** Query pages requested */
  siteQueries: { first: number; offset: number }[];
} {
  const upserts: UpsertVariables[] = [];
  const siteQueries: { first: number; offset: number }[] = [];
  const request = async (document: unknown, variables: unknown): Promise<unknown> => {
    const doc = String(document);
    if (doc.includes('TranscendCliFetchConsentManagerId')) {
      return { consentManager: { consentManager: { id: 'bundle-1' } } };
    }
    if (doc.includes('TranscendCliConsentSites')) {
      const { first, offset } = variables as { first: number; offset: number };
      siteQueries.push({ first, offset });
      const siteNames = [...new Set(hosts.map((h) => h.site))].sort();
      const page = siteNames.slice(offset, offset + first);
      return {
        consentSites: {
          totalSiteCount: siteNames.length,
          totalHostCount: hosts.length,
          nodes: page.map((site) => ({
            site,
            hosts: hosts.filter((h) => h.site === site),
          })),
        },
      };
    }
    if (doc.includes('TranscendCliCreateOrUpdateConsentSites')) {
      if (options.failMutation) {
        throw new Error('Client error: boom');
      }
      const vars = variables as UpsertVariables;
      upserts.push(vars);
      vars.sites.forEach((input) => {
        const next: FakeHost = {
          id: `host-${input.host}`,
          host: input.host,
          site: input.site ?? input.host.split('.').slice(-2).join('.'),
          description: input.description ?? null,
          includeInMetadata: input.includeInMetadata ?? true,
          deletedAt: null,
          owners: (input.ownerEmails ?? []).map((email) => ({
            id: `user-${email}`,
            name: email.split('@')[0] ?? email,
            email,
          })),
          teams: (input.teamNames ?? []).map((name) => ({ id: `team-${name}`, name })),
          attributeValues: (input.attributes ?? []).flatMap(({ key, values }) =>
            values.map((value) => ({
              id: `value-${key}-${value}`,
              name: value,
              attributeKey: { id: `key-${key}`, name: key },
            })),
          ),
        };
        const existing = hosts.findIndex((h) => h.host === input.host);
        if (existing >= 0) {
          hosts[existing] = next;
        } else {
          hosts.push(next);
        }
      });
      return { createOrUpdateConsentSites: { totalCount: vars.sites.length } };
    }
    throw new Error(`Unexpected GraphQL document: ${doc}`);
  };
  return { client: { request } as unknown as GraphQLClient, upserts, siteQueries };
}

/**
 * Build a fake host
 *
 * @param overrides - Fields to override
 * @returns A fake host
 */
function buildHost(overrides: Partial<FakeHost> & Pick<FakeHost, 'host' | 'site'>): FakeHost {
  return {
    id: `host-${overrides.host}`,
    description: null,
    includeInMetadata: true,
    deletedAt: null,
    owners: [],
    teams: [],
    attributeValues: [],
    ...overrides,
  };
}

describe('consent-sites', () => {
  it('has a yml codec that accepts host-only and fully specified entries', () => {
    const decoded = TranscendInput.decode({
      'consent-sites': [
        { host: 'app.example.com' },
        {
          host: 'admin.example.com',
          site: 'example.com',
          description: 'Admin app',
          includeInMetadata: false,
          owners: ['a@example.com'],
          teams: ['Privacy'],
          attributes: [{ key: 'Env', values: ['prod'] }],
        },
      ],
    });
    expect(decoded._tag).toBe('Right');
    expect(TranscendInput.decode({ 'consent-sites': [{ site: 'example.com' }] })._tag).toBe('Left');
    expect(
      TranscendInput.decode({
        'consent-sites': [{ host: 'app.example.com', includeInMetadata: 'yes' }],
      })._tag,
    ).toBe('Left');
  });

  it('pushes includeInMetadata only when it is set', async () => {
    const { client, upserts } = buildFakeClient([]);

    const result = await syncConfigurationToTranscend(
      {
        'consent-sites': [
          { host: 'on.example.com', includeInMetadata: true },
          { host: 'off.example.com', includeInMetadata: false },
          { host: 'unset.example.com' },
        ],
      },
      client,
      {},
    );

    expect(result.success).toBe(true);
    expect(
      upserts[0]?.sites.map(({ host, includeInMetadata }) => [host, includeInMetadata]),
    ).toEqual([
      ['on.example.com', true],
      ['off.example.com', false],
      ['unset.example.com', undefined],
    ]);
  });

  it('pulls includeInMetadata only for hosts where it is true', async () => {
    const { client } = buildFakeClient([
      buildHost({ host: 'on.example.com', site: 'example.com', includeInMetadata: true }),
      buildHost({ host: 'off.example.com', site: 'example.com', includeInMetadata: false }),
    ]);

    const result = await pullTranscendConfiguration(client, {
      dataSiloIds: [],
      integrationNames: [],
      debug: false,
      pageSize: 50,
      resources: [TranscendPullResource.ConsentSites],
    });

    const byHost = Object.fromEntries(
      (result['consent-sites'] ?? []).map((site) => [site.host, site]),
    );
    expect(byHost['on.example.com']?.includeInMetadata).toBe(true);
    expect(byHost['off.example.com']).not.toHaveProperty('includeInMetadata', false);
    expect(byHost['off.example.com']?.includeInMetadata).toBeUndefined();
  });

  it('leaves consent-manager.domains as a plain string list', () => {
    const decoded = TranscendInput.decode({
      'consent-manager': { bundleURLs: {}, domains: ['example.com'] },
    });
    expect(decoded._tag).toBe('Right');
  });

  it('maps the resource to the consent manager scopes', () => {
    expect(TR_PULL_RESOURCE_SCOPE_MAP[TranscendPullResource.ConsentSites]).toEqual([
      'viewConsentManager',
    ]);
    expect(TR_PUSH_RESOURCE_SCOPE_MAP[TranscendPullResource.ConsentSites]).toEqual([
      'manageConsentManager',
    ]);
  });

  it('uses GraphQL operations that are valid against the schema', () => {
    const schema = buildSchema(
      readFileSync(
        fileURLToPath(new URL('../../../../../schema.graphql', import.meta.url)),
        'utf8',
      ),
    );
    [CONSENT_SITES, CREATE_OR_UPDATE_CONSENT_SITES].forEach((document) => {
      expect(validate(schema, parse(String(document)))).toEqual([]);
    });
  });

  it('pulls hosts with owners, teams and attributes, skipping deleted hosts', async () => {
    const { client } = buildFakeClient([
      buildHost({
        host: 'app.example.com',
        site: 'example.com',
        description: 'Main app',
        owners: [{ id: 'u1', name: 'Ann', email: 'ann@example.com' }],
        teams: [{ id: 't1', name: 'Privacy' }],
        attributeValues: [
          { id: 'v1', name: 'prod', attributeKey: { id: 'k1', name: 'Env' } },
          { id: 'v2', name: 'internal', attributeKey: { id: 'k1', name: 'Env' } },
        ],
      }),
      buildHost({ host: 'old.example.com', site: 'example.com', deletedAt: '2026-01-01' }),
      buildHost({ host: 'bare.other.org', site: 'other.org' }),
    ]);

    const result = await pullTranscendConfiguration(client, {
      dataSiloIds: [],
      integrationNames: [],
      debug: false,
      pageSize: 50,
      resources: [TranscendPullResource.ConsentSites],
    });

    expect(result['consent-sites']).toEqual([
      {
        host: 'app.example.com',
        site: 'example.com',
        description: 'Main app',
        includeInMetadata: true,
        owners: ['ann@example.com'],
        teams: ['Privacy'],
        attributes: [{ key: 'Env', values: ['prod', 'internal'] }],
      },
      {
        host: 'bare.other.org',
        site: 'other.org',
        description: undefined,
        includeInMetadata: true,
        owners: [],
        teams: [],
        attributes: undefined,
      },
    ]);
  });

  it('paginates over sites', async () => {
    const hosts = Array.from({ length: 25 }, (_, i) =>
      buildHost({ host: `a.site${String(i).padStart(2, '0')}.com`, site: `site${i}.com` }),
    );
    const { client, siteQueries } = buildFakeClient(hosts);

    const result = await pullTranscendConfiguration(client, {
      dataSiloIds: [],
      integrationNames: [],
      debug: false,
      pageSize: 50,
      resources: [TranscendPullResource.ConsentSites],
    });

    expect(result['consent-sites']).toHaveLength(25);
    expect(siteQueries.map(({ offset }) => offset)).toEqual([0, 20]);
  });

  it('keeps host, owners, teams and attributes intact on a pull then push round trip', async () => {
    const source = buildFakeClient([
      buildHost({
        host: 'app.example.com',
        site: 'example.com',
        description: 'Main app',
        owners: [
          { id: 'u1', name: 'ann', email: 'ann@example.com' },
          { id: 'u2', name: 'bob', email: 'bob@example.com' },
        ],
        teams: [{ id: 't1', name: 'Privacy' }],
        attributeValues: [{ id: 'v1', name: 'prod', attributeKey: { id: 'k1', name: 'Env' } }],
      }),
    ]);
    const pullInput = {
      dataSiloIds: [],
      integrationNames: [],
      debug: false,
      pageSize: 50,
      resources: [TranscendPullResource.ConsentSites],
    };
    const pulled = await pullTranscendConfiguration(source.client, pullInput);

    const target = buildFakeClient([]);
    const syncResult = await syncConfigurationToTranscend(pulled, target.client, {});
    expect(syncResult.success).toBe(true);

    expect(target.upserts).toHaveLength(1);
    const [upsert] = target.upserts;
    expect(upsert?.airgapBundleId).toBe('bundle-1');
    expect(upsert?.sites).toEqual([
      {
        host: 'app.example.com',
        site: 'example.com',
        description: 'Main app',
        includeInMetadata: true,
        ownerEmails: ['ann@example.com', 'bob@example.com'],
        teamNames: ['Privacy'],
        attributes: [{ key: 'Env', values: ['prod'] }],
      },
    ]);

    const repulled = await pullTranscendConfiguration(target.client, pullInput);
    expect(repulled['consent-sites']).toEqual(pulled['consent-sites']);
  });

  it('reports an error instead of throwing when the mutation fails', async () => {
    const { client: failing } = buildFakeClient([], { failMutation: true });

    const result = await syncConfigurationToTranscend(
      { 'consent-sites': [{ host: 'app.example.com' }] },
      failing,
      {},
    );

    expect(result.success).toBe(false);
    expect(result.errors).toEqual([
      { resource: 'consent-sites', item: undefined, message: 'Failed to sync consent sites' },
    ]);
  });

  it('rejects duplicate hosts before sending anything', async () => {
    const { client, upserts } = buildFakeClient([]);
    await expect(
      syncConfigurationToTranscend(
        { 'consent-sites': [{ host: 'app.example.com' }, { host: 'app.example.com' }] },
        client,
        {},
      ),
    ).rejects.toThrow(/non-unique hosts/);
    expect(upserts).toHaveLength(0);
  });
});
