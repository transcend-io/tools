import { describe, expect, it, vi } from 'vitest';

import { downloadPolicyBundleBytes } from '../downloadPolicyBundleBytes.js';

describe('downloadPolicyBundleBytes', () => {
  it('downloads bytes through the injected HTTP boundary', async () => {
    const bytes = Uint8Array.from([1, 2, 3]);
    const getBuffer = vi.fn().mockResolvedValue(bytes);

    await expect(
      downloadPolicyBundleBytes('https://s3.example.com/presigned-bundle.tar.gz', {
        getBuffer,
      }),
    ).resolves.toBe(bytes);
    expect(getBuffer).toHaveBeenCalledWith('https://s3.example.com/presigned-bundle.tar.gz');
  });

  it('wraps download failures with policy bundle context', async () => {
    const cause = new Error('Request timed out');
    const getBuffer = vi.fn().mockRejectedValue(cause);

    await expect(
      downloadPolicyBundleBytes('https://s3.example.com/presigned-bundle.tar.gz', {
        getBuffer,
      }),
    ).rejects.toMatchObject({
      message: 'Failed to download policy bundle from the presigned URL: Request timed out',
      cause,
    });
  });
});
