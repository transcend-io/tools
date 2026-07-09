import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LocalContext } from '../../../../context.js';
import { logger } from '../../../../logger.js';
import { defaultPolicyDownloadOutputPath, download } from '../impl.js';

const buildPolicyEngineClientMock = vi.hoisted(() => vi.fn());
const resolveBundleIdByNameMock = vi.hoisted(() => vi.fn());
const resolvePolicyBundleVersionMock = vi.hoisted(() => vi.fn());
const gotMock = vi.hoisted(() => vi.fn());

vi.mock('../../helpers/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../helpers/index.js')>();
  return {
    ...actual,
    buildPolicyEngineClient: buildPolicyEngineClientMock,
    resolveBundleIdByName: resolveBundleIdByNameMock,
    resolvePolicyBundleVersion: resolvePolicyBundleVersionMock,
  };
});

vi.mock('got', () => ({
  default: Object.assign(gotMock, {
    extend: vi.fn(),
  }),
}));

const sampleVersion = {
  id: 'version-id',
  version: '2026-06-25',
  sha256: 'deadbeef',
  sizeBytes: 100,
  description: null,
  createdBy: 'test-user',
  activatedAt: null,
  deactivatedAt: null,
  createdAt: '2026-06-25T00:00:00.000Z',
  updatedAt: '2026-06-25T00:00:00.000Z',
};

const sampleDownloadResponse = {
  versionId: 'version-id',
  version: '2026-06-25',
  bundleName: 'main',
  uploadedAt: '2026-06-25T00:00:00.000Z',
  activatedAt: null,
  deactivatedAt: null,
  description: null,
  sha256: 'deadbeef',
  sizeBytes: 100,
  downloadUrl: 'https://s3.example.com/presigned-bundle.tar.gz',
};

describe('download', () => {
  const exit = vi.fn();
  const stdout = { write: vi.fn() };
  const context = {
    process: { exit, stdout },
  } as unknown as LocalContext;

  let tempDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(logger, 'info').mockImplementation(() => undefined);
    process.env.DEVELOPMENT_MODE_VALIDATE_ONLY = 'false';
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'policy-download-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('resolves name/version, downloads from the presigned URL, and writes the file', async () => {
    const get = vi.fn().mockReturnValue({
      json: vi.fn().mockResolvedValue(sampleDownloadResponse),
    });
    buildPolicyEngineClientMock.mockReturnValue({ get });
    resolveBundleIdByNameMock.mockResolvedValue('resolved-bundle-id');
    resolvePolicyBundleVersionMock.mockResolvedValue(sampleVersion);
    gotMock.mockReturnValue({
      buffer: vi.fn().mockResolvedValue(Buffer.from('bundle-bytes')),
    });

    const outputPath = path.join(tempDir, 'main-2026-06-25.tar.gz');

    await download.call(context, {
      'bundle-name': 'main',
      version: '2026-06-25',
      output: outputPath,
      auth: 'test-key',
      'transcend-url': 'https://api.transcend.io',
      json: false,
    });

    expect(resolveBundleIdByNameMock).toHaveBeenCalledWith(expect.anything(), 'main');
    expect(resolvePolicyBundleVersionMock).toHaveBeenCalledWith(
      expect.anything(),
      'resolved-bundle-id',
      { version: '2026-06-25' },
    );
    expect(get).toHaveBeenCalledWith(
      'v1/policy-engine/policy-bundles/resolved-bundle-id/versions/version-id',
    );
    expect(gotMock).toHaveBeenCalledWith(sampleDownloadResponse.downloadUrl);
    expect(Buffer.from(fs.readFileSync(outputPath))).toEqual(Buffer.from('bundle-bytes'));
    expect(stdout.write).toHaveBeenCalledWith(expect.stringContaining('bundleName  main'));
    expect(stdout.write).toHaveBeenCalledWith(expect.stringContaining(`output      ${outputPath}`));
    expect(stdout.write).toHaveBeenCalledWith(expect.stringContaining('sha256      deadbeef'));
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Policy bundle downloaded successfully.'),
    );
  });

  it('prints raw JSON and skips the file write when --json is set', async () => {
    const get = vi.fn().mockReturnValue({
      json: vi.fn().mockResolvedValue(sampleDownloadResponse),
    });
    buildPolicyEngineClientMock.mockReturnValue({ get });
    resolveBundleIdByNameMock.mockResolvedValue('resolved-bundle-id');
    resolvePolicyBundleVersionMock.mockResolvedValue(sampleVersion);

    await download.call(context, {
      'bundle-name': 'main',
      version: '2026-06-25',
      auth: 'test-key',
      'transcend-url': 'https://api.transcend.io',
      json: true,
    });

    expect(gotMock).not.toHaveBeenCalled();
    expect(stdout.write).toHaveBeenCalledWith(
      expect.stringContaining('"downloadUrl": "https://s3.example.com/presigned-bundle.tar.gz"'),
    );
  });

  it('throws a CLI-side error when the bundle name is unknown (before calling the monolith)', async () => {
    const get = vi.fn();
    buildPolicyEngineClientMock.mockReturnValue({ get });
    resolveBundleIdByNameMock.mockResolvedValue(undefined);

    await expect(
      download.call(context, {
        'bundle-name': 'missing',
        version: '2026-06-25',
        auth: 'test-key',
        'transcend-url': 'https://api.transcend.io',
        json: false,
      }),
    ).rejects.toThrow('Policy bundle "missing" was not found for this organization.');

    expect(get).not.toHaveBeenCalled();
    expect(resolvePolicyBundleVersionMock).not.toHaveBeenCalled();
  });

  it('surfaces version resolution errors before fetching the download URL', async () => {
    const get = vi.fn();
    buildPolicyEngineClientMock.mockReturnValue({ get });
    resolveBundleIdByNameMock.mockResolvedValue('resolved-bundle-id');
    resolvePolicyBundleVersionMock.mockRejectedValue(
      new Error('Version "missing" was not found for this policy bundle.'),
    );

    await expect(
      download.call(context, {
        'bundle-name': 'main',
        version: 'missing',
        auth: 'test-key',
        'transcend-url': 'https://api.transcend.io',
        json: false,
      }),
    ).rejects.toThrow('Version "missing" was not found for this policy bundle.');

    expect(get).not.toHaveBeenCalled();
  });

  it('surfaces a clear error when the presigned S3 download fails', async () => {
    const get = vi.fn().mockReturnValue({
      json: vi.fn().mockResolvedValue(sampleDownloadResponse),
    });
    buildPolicyEngineClientMock.mockReturnValue({ get });
    resolveBundleIdByNameMock.mockResolvedValue('resolved-bundle-id');
    resolvePolicyBundleVersionMock.mockResolvedValue(sampleVersion);
    gotMock.mockReturnValue({
      buffer: vi.fn().mockRejectedValue(new Error('Request timed out')),
    });

    await expect(
      download.call(context, {
        'bundle-name': 'main',
        version: '2026-06-25',
        output: path.join(tempDir, 'out.tar.gz'),
        auth: 'test-key',
        'transcend-url': 'https://api.transcend.io',
        json: false,
      }),
    ).rejects.toThrow('Failed to download policy bundle from the presigned URL: Request timed out');
  });

  it('surfaces monolith errors via the shared error formatter', async () => {
    const httpError = {
      response: {
        statusCode: 401,
        body: JSON.stringify({ message: 'Missing required scope.' }),
      },
    };
    const get = vi.fn().mockReturnValue({
      json: vi.fn().mockRejectedValue(httpError),
    });
    buildPolicyEngineClientMock.mockReturnValue({ get });
    resolveBundleIdByNameMock.mockResolvedValue('resolved-bundle-id');
    resolvePolicyBundleVersionMock.mockResolvedValue(sampleVersion);

    await expect(
      download.call(context, {
        'bundle-name': 'main',
        version: '2026-06-25',
        auth: 'test-key',
        'transcend-url': 'https://api.transcend.io',
        json: false,
      }),
    ).rejects.toThrow('Missing required scope.');
  });

  it('builds the default output filename from bundle name and version', () => {
    expect(defaultPolicyDownloadOutputPath('main', '2026-06-25')).toBe('main-2026-06-25.tar.gz');
  });
});
