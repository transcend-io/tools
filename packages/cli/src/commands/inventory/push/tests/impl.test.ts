import type fs from 'node:fs';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildContextForTest } from '../../../../lib/tests/helpers/buildContextForTest.js';
import { push, type PushCommandFlags } from '../impl.js';

const pullTranscendConfigurationMock = vi.hoisted(() => vi.fn());
const syncConfigurationToTranscendMock = vi.hoisted(() => vi.fn());

vi.mock('@transcend-io/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@transcend-io/sdk')>();
  return {
    ...actual,
    buildTranscendGraphQLClient: vi.fn(() => ({})),
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
  beforeEach(() => {
    vi.clearAllMocks();
    pullTranscendConfigurationMock.mockResolvedValue({
      vendors: [{ title: 'Segment', description: 'CDP' }],
    });
    syncConfigurationToTranscendMock.mockResolvedValue({ success: true, errors: [] });
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
});
