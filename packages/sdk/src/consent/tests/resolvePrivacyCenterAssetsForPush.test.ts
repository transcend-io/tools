import { GraphQLClient } from 'graphql-request';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const uploadAssetFileFromUrl = vi.fn();

vi.mock('../uploadAssetFileFromUrl.js', () => ({
  uploadAssetFileFromUrl: (...args: unknown[]) => uploadAssetFileFromUrl(...args),
}));

import { resolvePrivacyCenterAssetsForPush } from '../resolvePrivacyCenterAssetsForPush.js';

describe('resolvePrivacyCenterAssetsForPush', () => {
  const client = new GraphQLClient('https://api.transcend.io/graphql', {
    headers: { Authorization: 'Bearer test-key' },
  });

  beforeEach(() => {
    uploadAssetFileFromUrl.mockReset();
  });

  it('reuses ids when provided', async () => {
    const resolved = await resolvePrivacyCenterAssetsForPush(client, {
      favicon: { id: 'asset-1', src: 'https://cdn.example/fav.png' },
    });

    expect(resolved).toEqual({ favicon: { id: 'asset-1' } });
    expect(uploadAssetFileFromUrl).not.toHaveBeenCalled();
  });

  it('uploads from src when id is absent', async () => {
    uploadAssetFileFromUrl.mockResolvedValue({ id: 'asset-2', src: 'https://cdn.new/fav.png' });

    const resolved = await resolvePrivacyCenterAssetsForPush(client, {
      favicon: { src: 'https://cdn.example/fav.png', alt: 'Favicon' },
    });

    expect(uploadAssetFileFromUrl).toHaveBeenCalledWith(
      'https://api.transcend.io',
      'Bearer test-key',
      'https://cdn.example/fav.png',
    );
    expect(resolved).toEqual({ favicon: { id: 'asset-2', alt: 'Favicon' } });
  });
});
