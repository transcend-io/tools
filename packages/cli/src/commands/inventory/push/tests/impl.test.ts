import type fs from 'node:fs';

import { TranscendPullResource } from '@transcend-io/sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildContextForTest } from '../../../../lib/tests/helpers/buildContextForTest.js';
import { push, type PushCommandFlags } from '../impl.js';

const fetchConsentManagerIdMock = vi.hoisted(() => vi.fn());
const pullTranscendConfigurationMock = vi.hoisted(() => vi.fn());
const previewPushMock = vi.hoisted(() => vi.fn());
const syncConfigurationToTranscendMock = vi.hoisted(() => vi.fn());

vi.mock('@transcend-io/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@transcend-io/sdk')>();
  return {
    ...actual,
    buildTranscendGraphQLClient: vi.fn(() => ({})),
    fetchConsentManagerId: fetchConsentManagerIdMock,
    previewPush: previewPushMock,
    pullTranscendConfiguration: pullTranscendConfigurationMock,
    syncConfigurationToTranscend: syncConfigurationToTranscendMock,
  };
});

const YAML_PATH = './transcend.yml';
const YAML = `vendors:
  - title: Stripe
  - title: Segment
    description: Customer data platform
`;

const flags = (overrides: Partial<PushCommandFlags> = {}): PushCommandFlags => ({
  auth: 'api-key',
  file: YAML_PATH,
  transcendUrl: 'https://api.transcend.io',
  pageSize: 50,
  variables: '',
  publishToPrivacyCenter: false,
  classifyService: false,
  deleteExtraAttributeValues: false,
  dryRun: false,
  json: false,
  ...overrides,
});

const testFs = {
  existsSync: (path: string) => path === YAML_PATH,
  readFileSync: () => YAML,
} as unknown as typeof fs;

describe('inventory push', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    fetchConsentManagerIdMock.mockResolvedValue('bundle-a');
    pullTranscendConfigurationMock.mockResolvedValue({
      vendors: [{ title: 'Segment', description: 'CDP' }],
    });
    syncConfigurationToTranscendMock.mockResolvedValue({ success: true, errors: [] });
    const { buildSnapshotRequest, planPush } = await import('@transcend-io/sdk');
    previewPushMock.mockImplementation(async (client, contents, options = {}) => {
      const remote = await pullTranscendConfigurationMock(client, {
        ...buildSnapshotRequest(contents),
        dataSiloIds: [],
        integrationNames: [],
        pageSize: options.pageSize ?? 50,
        debug: false,
      });
      return planPush(contents, remote, {
        deleteExtraAttributeValues: options.deleteExtraAttributeValues,
      });
    });
  });

  it('--dryRun prints the plan and never writes', async () => {
    const context = buildContextForTest({ fs: testFs });
    await push.call(context, flags({ dryRun: true }));

    expect(syncConfigurationToTranscendMock).not.toHaveBeenCalled();
    expect(context.stdout).toContain('+ create  "Stripe"');
    expect(context.stdout).toContain('description: "CDP" -> "Customer data platform"');
    expect(context.stdout).toContain('1 to create, 1 to update, 0 unchanged');
  });

  it('--dryRun only pulls what the file defines', async () => {
    const context = buildContextForTest({ fs: testFs });
    await push.call(context, flags({ dryRun: true }));

    expect(pullTranscendConfigurationMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ resources: ['vendors'], skipDatapoints: true }),
    );
  });

  it('--dryRun --json prints only the plan as JSON', async () => {
    const context = buildContextForTest({ fs: testFs });
    await push.call(context, flags({ dryRun: true, json: true }));

    const output = JSON.parse(context.stdout);
    expect(output.dryRun).toBe(true);
    expect(output.targets[0].plan.summary).toMatchObject({ create: 1, update: 1 });
    expect(syncConfigurationToTranscendMock).not.toHaveBeenCalled();
  });

  it('--dryRun exits 1 when the snapshot fails', async () => {
    pullTranscendConfigurationMock.mockRejectedValue(new Error('missing scope'));
    const context = buildContextForTest({ fs: testFs });

    await expect(push.call(context, flags({ dryRun: true }))).rejects.toThrow();
    expect(context.exit).toHaveBeenCalledWith(1);
    expect(context.stderr).toContain('Failed to preview the push: missing scope');
    expect(syncConfigurationToTranscendMock).not.toHaveBeenCalled();
  });

  it('still syncs without --dryRun and does not pull a snapshot', async () => {
    const context = buildContextForTest({ fs: testFs });
    await push.call(context, flags());

    expect(syncConfigurationToTranscendMock).toHaveBeenCalledTimes(1);
    expect(pullTranscendConfigurationMock).not.toHaveBeenCalled();
  });

  describe('--expectBundleId', () => {
    it('pushes when the bundle id matches', async () => {
      const context = buildContextForTest({ fs: testFs });
      await push.call(context, flags({ expectBundleId: 'bundle-a' }));

      expect(fetchConsentManagerIdMock).toHaveBeenCalledTimes(1);
      expect(syncConfigurationToTranscendMock).toHaveBeenCalledTimes(1);
    });

    it('aborts before the preview when the bundle id differs', async () => {
      const context = buildContextForTest({ fs: testFs });

      await expect(push.call(context, flags({ expectBundleId: 'bundle-b' }))).rejects.toThrow(
        'bundle id of this organization is bundle-a',
      );
      expect(previewPushMock).not.toHaveBeenCalled();
      expect(syncConfigurationToTranscendMock).not.toHaveBeenCalled();
    });

    it('aborts before --dryRun when the bundle id differs', async () => {
      const context = buildContextForTest({ fs: testFs });

      await expect(
        push.call(context, flags({ dryRun: true, expectBundleId: 'bundle-b' })),
      ).rejects.toThrow('--expectBundleId');
      expect(previewPushMock).not.toHaveBeenCalled();
      expect(syncConfigurationToTranscendMock).not.toHaveBeenCalled();
    });

    it('aborts when the organization has no consent manager', async () => {
      fetchConsentManagerIdMock.mockRejectedValue(new TypeError('consentManager is null'));
      const context = buildContextForTest({ fs: testFs });

      await expect(push.call(context, flags({ expectBundleId: 'bundle-a' }))).rejects.toThrow(
        'may have no consent manager',
      );
      expect(previewPushMock).not.toHaveBeenCalled();
      expect(syncConfigurationToTranscendMock).not.toHaveBeenCalled();
    });

    it('is rejected with a list of API keys', async () => {
      const keysFs = {
        existsSync: (path: string) => path === YAML_PATH || path === './keys.json',
        readFileSync: (path: string) =>
          path === './keys.json'
            ? JSON.stringify([
                { organizationName: 'one', apiKey: 'key-1', organizationId: 'org-1' },
                { organizationName: 'two', apiKey: 'key-2', organizationId: 'org-2' },
              ])
            : YAML,
      } as unknown as typeof fs;
      const context = buildContextForTest({ fs: keysFs });

      await expect(
        push.call(context, flags({ auth: './keys.json', expectBundleId: 'bundle-a' })),
      ).rejects.toThrow('cannot be used with a list of API keys');
      expect(fetchConsentManagerIdMock).not.toHaveBeenCalled();
      expect(syncConfigurationToTranscendMock).not.toHaveBeenCalled();
    });
  });

  describe('--resources', () => {
    const TWO_SECTIONS = `${YAML}data-subjects:
  - type: customer
`;
    const twoSectionFs = {
      existsSync: (path: string) => path === YAML_PATH,
      readFileSync: () => TWO_SECTIONS,
    } as unknown as typeof fs;

    it('strips other sections before planning and syncing', async () => {
      const context = buildContextForTest({ fs: twoSectionFs });
      await push.call(context, flags({ resources: [TranscendPullResource.DataSubjects] }));

      const [synced] = syncConfigurationToTranscendMock.mock.calls[0];
      expect(Object.keys(synced)).toEqual(['data-subjects']);
      expect(context.stdout).not.toContain('Stripe');
    });

    it('keeps every named section in --dryRun', async () => {
      const context = buildContextForTest({ fs: twoSectionFs });
      await push.call(
        context,
        flags({
          dryRun: true,
          resources: [TranscendPullResource.DataSubjects, TranscendPullResource.Vendors],
        }),
      );

      const [, previewed] = previewPushMock.mock.calls[0];
      expect(Object.keys(previewed).sort()).toEqual(['data-subjects', 'vendors']);
    });

    it('fails when a named section is not in the file', async () => {
      const context = buildContextForTest({ fs: testFs });

      await expect(
        push.call(context, flags({ resources: [TranscendPullResource.Teams] })),
      ).rejects.toThrow('--resources named teams');
      expect(previewPushMock).not.toHaveBeenCalled();
      expect(syncConfigurationToTranscendMock).not.toHaveBeenCalled();
    });

    it('checks the bundle id after narrowing and before the preview', async () => {
      fetchConsentManagerIdMock.mockResolvedValue('bundle-z');
      const context = buildContextForTest({ fs: twoSectionFs });

      await expect(
        push.call(
          context,
          flags({
            dryRun: true,
            expectBundleId: 'bundle-a',
            resources: [TranscendPullResource.Vendors],
          }),
        ),
      ).rejects.toThrow('bundle id');
      expect(previewPushMock).not.toHaveBeenCalled();
    });
  });
});
