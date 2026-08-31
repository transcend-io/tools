import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  assertSafePolicyBundleRelativePath,
  packPolicyBundleTarball,
  packPolicyBundleTarballFromFiles,
} from '../src/helpers/packPolicyBundleTarball.js';
import {
  activatePolicyBundleVersion,
  deactivatePolicyBundle,
  listPolicyBundleVersions,
  listPolicyBundles,
  publishPolicyBundle,
} from '../src/helpers/policyCliOperations.js';
import { POLICY_TEMPLATES } from '../src/templates/index.js';
import { getPolicyTools } from '../src/tools/index.js';
import { PolicyPublishSchema } from '../src/tools/policy_publish.js';

const EXPECTED_TOOL_NAMES = [
  'policy_help',
  'policy_status',
  'policy_publish',
  'policy_set_live',
] as const;

const STARTER_FILES = POLICY_TEMPLATES.starter.files;

function writeStarterBundle(dir: string): void {
  fs.mkdirSync(path.join(dir, 'policy_engine'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ roots: ['policy_engine'] }));
  fs.writeFileSync(
    path.join(dir, 'policy_engine', 'decision.rego'),
    'package policy_engine\n\ndefault decision := "deny"\n',
  );
}

describe('Policy MCP tools', () => {
  const mockClient = {
    get: vi.fn(),
    post: vi.fn(),
  };

  const clients = {
    rest: {} as never,
    graphql: {} as never,
    dashboardUrl: 'https://app.transcend.io',
    transcendApiUrl: 'https://api.transcend.io',
    auth: { type: 'apiKey' as const, apiKey: 'test-key' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers exactly 4 tools with expected names', () => {
    const tools = getPolicyTools(clients);
    expect(tools).toHaveLength(4);
    expect(tools.map((tool) => tool.name)).toEqual([...EXPECTED_TOOL_NAMES]);
  });

  describe('policy_help', () => {
    it('returns guide and template list by default', async () => {
      const tool = getPolicyTools(clients).find((entry) => entry.name === 'policy_help')!;
      const result = await tool.handler({});
      expect(result).toMatchObject({
        success: true,
        data: {
          guide: expect.stringContaining('ActivatePolicyEngineBundles'),
          templates: expect.arrayContaining([expect.objectContaining({ id: 'starter' })]),
        },
      });
      expect(result.data).toMatchObject({
        guide: expect.stringContaining('files'),
      });
    });

    it('returns template files when templateId is set', async () => {
      const tool = getPolicyTools(clients).find((entry) => entry.name === 'policy_help')!;
      const result = await tool.handler({ templateId: 'starter' });
      expect(result).toMatchObject({
        success: true,
        data: {
          templateFiles: {
            files: expect.objectContaining({
              'manifest.json': expect.any(String),
              'policy_engine/decision.rego': expect.any(String),
            }),
          },
        },
      });
      expect(result.data).not.toHaveProperty('guide');
      expect(result.data).not.toHaveProperty('templates');
    });
  });

  describe('PolicyPublishSchema', () => {
    it('accepts dir without files', () => {
      expect(
        PolicyPublishSchema.safeParse({ dir: '/tmp/bundle', bundleName: 'main' }).success,
      ).toBe(true);
    });

    it('accepts files without dir', () => {
      expect(
        PolicyPublishSchema.safeParse({ files: STARTER_FILES, bundleName: 'main' }).success,
      ).toBe(true);
    });

    it('rejects when both dir and files are set', () => {
      const result = PolicyPublishSchema.safeParse({
        dir: '/tmp/bundle',
        files: STARTER_FILES,
        bundleName: 'main',
      });
      expect(result.success).toBe(false);
    });

    it('rejects when neither dir nor files is set', () => {
      const result = PolicyPublishSchema.safeParse({ bundleName: 'main' });
      expect(result.success).toBe(false);
    });
  });

  describe('packPolicyBundleTarball', () => {
    it('rejects directories without manifest.json', async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'policy-pack-'));
      await expect(packPolicyBundleTarball(dir)).rejects.toThrow(/manifest.json/);
    });

    it('rejects directories without publishable rego', async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'policy-pack-'));
      fs.writeFileSync(
        path.join(dir, 'manifest.json'),
        JSON.stringify({ roots: ['policy_engine'] }),
      );
      await expect(packPolicyBundleTarball(dir)).rejects.toThrow(/at least one .rego/);
    });

    it('packs manifest and rego without test files', async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'policy-pack-'));
      writeStarterBundle(dir);
      fs.writeFileSync(
        path.join(dir, 'policy_engine', 'decision_test.rego'),
        'package policy_engine\n',
      );

      const tarball = await packPolicyBundleTarball(dir);
      expect(fs.existsSync(tarball)).toBe(true);
      fs.unlinkSync(tarball);
    });

    it('packs from an in-memory files map including sample-input.json', async () => {
      const tarball = await packPolicyBundleTarballFromFiles(STARTER_FILES);
      expect(fs.existsSync(tarball)).toBe(true);
      fs.unlinkSync(tarball);
    });

    it('rejects path traversal in file keys', async () => {
      expect(() => assertSafePolicyBundleRelativePath('../etc/passwd')).toThrow(/\.\./);
      await expect(
        packPolicyBundleTarballFromFiles({
          '../etc/passwd': 'nope',
          'manifest.json': JSON.stringify({ roots: ['policy_engine'] }),
          'policy_engine/decision.rego': 'package policy_engine\n',
        }),
      ).rejects.toThrow(/\.\./);
    });

    it('rejects absolute file paths', async () => {
      await expect(
        packPolicyBundleTarballFromFiles({
          '/tmp/evil.rego': 'package policy_engine\n',
          'manifest.json': JSON.stringify({ roots: ['policy_engine'] }),
        }),
      ).rejects.toThrow(/relative/);
    });
  });

  describe('policyCliOperations', () => {
    it('listPolicyBundles calls the bundles endpoint', async () => {
      const json = vi.fn().mockResolvedValue({ nodes: [], totalCount: 0 });
      mockClient.get.mockReturnValue({ json });

      await listPolicyBundles(mockClient as never, { limit: 10, offset: 0 });

      expect(mockClient.get).toHaveBeenCalledWith('v1/policy-engine/policy-bundles', {
        searchParams: { limit: 10, offset: 0 },
      });
    });

    it('listPolicyBundleVersions marks cursor pagination', async () => {
      const json = vi.fn().mockResolvedValue({
        nodes: [{ id: 'v1', version: 'main-2026-01-01', createdAt: '2026-01-01T00:00:00Z' }],
        pageInfo: { hasNextPage: true, hasPreviousPage: false, endCursor: 'cursor-1' },
      });
      mockClient.get.mockReturnValue({ json });

      const result = await listPolicyBundleVersions(mockClient as never, 'bundle-1', {
        after: 'cursor-0',
      });

      expect(result.pageInfo.endCursor).toBe('cursor-1');
      expect(mockClient.get).toHaveBeenCalledWith(
        'v1/policy-engine/policy-bundles/bundle-1/versions',
        { searchParams: { limit: 50, after: 'cursor-0' } },
      );
    });

    it('publishPolicyBundle creates a bundle when none exists', async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'policy-publish-'));
      writeStarterBundle(dir);

      mockClient.get.mockReturnValue({
        json: vi.fn().mockResolvedValue({ nodes: [], totalCount: 0 }),
      });
      mockClient.post.mockReturnValue({
        json: vi.fn().mockResolvedValue({
          bundle: { id: 'b1', bundleName: 'main' },
          version: { id: 'v1', version: 'main-2026-01-01' },
        }),
      });

      const result = await publishPolicyBundle(mockClient as never, {
        dir,
        bundleName: 'main',
        version: 'main-2026-01-01',
      });

      expect(result).toMatchObject({
        bundle: { id: 'b1' },
        version: { id: 'v1' },
      });
      expect(mockClient.post).toHaveBeenCalledWith('v1/policy-engine/policy-bundles', {
        body: expect.any(FormData),
      });
    });

    it('publishPolicyBundle accepts an in-memory files map', async () => {
      mockClient.get.mockReturnValue({
        json: vi.fn().mockResolvedValue({ nodes: [], totalCount: 0 }),
      });
      mockClient.post.mockReturnValue({
        json: vi.fn().mockResolvedValue({
          bundle: { id: 'b1', bundleName: 'main' },
          version: { id: 'v1', version: 'main-2026-01-01' },
        }),
      });

      const result = await publishPolicyBundle(mockClient as never, {
        files: STARTER_FILES,
        bundleName: 'main',
        version: 'main-2026-01-01',
      });

      expect(result).toMatchObject({
        bundle: { id: 'b1' },
        version: { id: 'v1' },
      });
      expect(mockClient.post).toHaveBeenCalledWith('v1/policy-engine/policy-bundles', {
        body: expect.any(FormData),
      });
    });

    it('publishPolicyBundle rejects when both dir and files are set', async () => {
      await expect(
        publishPolicyBundle(mockClient as never, {
          dir: '/tmp/bundle',
          files: STARTER_FILES,
          bundleName: 'main',
        }),
      ).rejects.toThrow(/exactly one of dir or files/);
    });

    it('publishPolicyBundle appends a version when bundle exists', async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'policy-publish-'));
      writeStarterBundle(dir);

      mockClient.get.mockReturnValue({
        json: vi.fn().mockResolvedValue({
          nodes: [{ id: 'b1', bundleName: 'main' }],
          totalCount: 1,
        }),
      });
      mockClient.post.mockReturnValue({
        json: vi.fn().mockResolvedValue({
          version: { id: 'v2', version: 'main-2026-01-02' },
        }),
      });

      await publishPolicyBundle(mockClient as never, {
        dir,
        bundleName: 'main',
        version: 'main-2026-01-02',
      });

      expect(mockClient.post).toHaveBeenCalledWith('v1/policy-engine/policy-bundles/b1/versions', {
        body: expect.any(FormData),
      });
    });

    it('activatePolicyBundleVersion posts to activate endpoint', async () => {
      mockClient.get.mockReturnValue({
        json: vi
          .fn()
          .mockResolvedValueOnce({
            nodes: [{ id: 'b1', bundleName: 'main', activeVersionId: null }],
            totalCount: 1,
          })
          .mockResolvedValueOnce({
            nodes: [{ id: 'v1', version: 'main-2026-01-01', createdAt: '2026-01-01T00:00:00Z' }],
            pageInfo: { hasNextPage: false, hasPreviousPage: false },
          }),
      });
      mockClient.post.mockReturnValue({
        json: vi.fn().mockResolvedValue({
          bundle: { id: 'b1', bundleName: 'main', activeVersionId: 'v1' },
          version: { id: 'v1', version: 'main-2026-01-01' },
        }),
      });

      await activatePolicyBundleVersion(mockClient as never, {
        bundleName: 'main',
        versionId: 'v1',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'v1/policy-engine/policy-bundles/b1/versions/v1/activate',
        { json: {} },
      );
    });

    it('deactivatePolicyBundle posts to deactivate endpoint', async () => {
      mockClient.get.mockReturnValue({
        json: vi.fn().mockResolvedValue({
          nodes: [{ id: 'b1', bundleName: 'main', activeVersionId: 'v1' }],
          totalCount: 1,
        }),
      });
      mockClient.post.mockReturnValue({
        json: vi.fn().mockResolvedValue({
          bundle: { id: 'b1', bundleName: 'main', activeVersionId: null },
          version: { id: 'v1', version: 'main-2026-01-01' },
        }),
      });

      await deactivatePolicyBundle(mockClient as never, 'main');

      expect(mockClient.post).toHaveBeenCalledWith('v1/policy-engine/policy-bundles/b1/deactivate');
    });
  });
});
