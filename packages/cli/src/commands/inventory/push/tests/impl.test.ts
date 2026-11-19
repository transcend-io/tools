import type fs from 'node:fs';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildContextForTest } from '../../../../lib/tests/helpers/buildContextForTest.js';
import { push, type PushCommandFlags } from '../impl.js';

const pullTranscendConfigurationMock = vi.hoisted(() => vi.fn());
const confirmMock = vi.hoisted(() => vi.fn());
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

vi.mock('../../../../lib/scaffolding/prompts.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../lib/scaffolding/prompts.js')>();
  return {
    ...actual,
    ScaffoldPrompts: class {
      confirm = confirmMock;
    },
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
  yes: false,
  skipPreview: false,
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

  it('--skipPreview syncs straight away without pulling a snapshot', async () => {
    const context = buildContextForTest({ fs: testFs });
    await push.call(context, flags({ skipPreview: true }));

    expect(syncConfigurationToTranscendMock).toHaveBeenCalledTimes(1);
    expect(pullTranscendConfigurationMock).not.toHaveBeenCalled();
  });

  describe('confirmation', () => {
    it('--yes shows the preview and applies without asking', async () => {
      const context = buildContextForTest({ fs: testFs });
      await push.call(context, flags({ yes: true }));

      expect(context.stdout).toContain('1 to create, 1 to update');
      expect(confirmMock).not.toHaveBeenCalled();
      expect(syncConfigurationToTranscendMock).toHaveBeenCalledTimes(1);
    });

    it('asks in a terminal and applies when approved', async () => {
      confirmMock.mockResolvedValue(true);
      const context = buildContextForTest({ fs: testFs, stderrIsTTY: true });
      await push.call(context, flags());

      expect(confirmMock).toHaveBeenCalledWith('Apply these changes?', false);
      expect(syncConfigurationToTranscendMock).toHaveBeenCalledTimes(1);
    });

    it('does not sync when the user declines', async () => {
      confirmMock.mockResolvedValue(false);
      const context = buildContextForTest({ fs: testFs, stderrIsTTY: true });
      await push.call(context, flags());

      expect(syncConfigurationToTranscendMock).not.toHaveBeenCalled();
      expect(context.stdout).toContain('Push cancelled');
    });

    it('fails without a terminal and without --yes', async () => {
      const context = buildContextForTest({ fs: testFs, stdinIsTTY: false });

      await expect(push.call(context, flags())).rejects.toThrow('pass --yes');
      expect(syncConfigurationToTranscendMock).not.toHaveBeenCalled();
    });

    it('does nothing when the file matches the organization', async () => {
      pullTranscendConfigurationMock.mockResolvedValue({
        vendors: [{ title: 'Stripe' }, { title: 'Segment', description: 'Customer data platform' }],
      });
      const context = buildContextForTest({ fs: testFs });
      await push.call(context, flags({ yes: true }));

      expect(context.stdout).toContain('No changes detected');
      expect(syncConfigurationToTranscendMock).not.toHaveBeenCalled();
    });

    it('does not push when the preview fails', async () => {
      pullTranscendConfigurationMock.mockRejectedValue(new Error('missing scope'));
      const context = buildContextForTest({ fs: testFs });

      await expect(push.call(context, flags({ yes: true }))).rejects.toThrow();
      expect(context.stderr).toContain('Use --skipPreview');
      expect(syncConfigurationToTranscendMock).not.toHaveBeenCalled();
    });

    it('rejects --json without --dryRun and --dryRun with --skipPreview', async () => {
      const context = buildContextForTest({ fs: testFs });
      await expect(push.call(context, flags({ json: true }))).rejects.toThrow('--dryRun');
      await expect(push.call(context, flags({ dryRun: true, skipPreview: true }))).rejects.toThrow(
        'cannot be used together',
      );
    });
  });
});
