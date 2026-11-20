import type { Logger } from '@transcend-io/utils';
import got from 'got';

import { NOOP_LOGGER } from '../api/makeGraphQLRequest.js';

export interface UploadedAssetFile {
  /** Database id of the asset file */
  id: string;
  /** Public CDN URL for the asset */
  src: string;
}

const MAX_ASSET_BYTES = 5 * 1024 * 1024;

/**
 * Re-host a remote image on the Transcend asset CDN via `/files/assetFile/upload`.
 *
 * @param transcendUrl - API base URL (no trailing slash)
 * @param authorizationHeader - Value of the `Authorization` header (e.g. `Bearer …`)
 * @param src - Public URL of the image to copy
 * @param options - Options
 */
export async function uploadAssetFileFromUrl(
  transcendUrl: string,
  authorizationHeader: string,
  src: string,
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<UploadedAssetFile> {
  const { logger = NOOP_LOGGER } = options;
  const download = await got(src, {
    responseType: 'buffer',
    throwHttpErrors: true,
  });
  const contentType = download.headers['content-type'] ?? 'application/octet-stream';
  if (!contentType.startsWith('image/')) {
    throw new Error(`Asset at "${src}" is not an image (content-type "${contentType}")`);
  }
  if (download.body.length > MAX_ASSET_BYTES) {
    throw new Error(`Asset at "${src}" exceeds the ${MAX_ASSET_BYTES} byte upload limit`);
  }

  const fileName = (() => {
    try {
      const base = new URL(src).pathname.split('/').filter(Boolean).at(-1);
      if (base?.includes('.')) {
        return base;
      }
      const ext = contentType.split('/')[1]?.split('+')[0] ?? 'img';
      return `${base ?? 'privacy-center-asset'}.${ext}`;
    } catch {
      return 'privacy-center-asset.bin';
    }
  })();

  const form = new FormData();
  form.append('file', new Blob([download.body], { type: contentType }), fileName);

  logger.info(`Uploading privacy center asset from "${src}"...`);
  const body = await got
    .post(`${transcendUrl.replace(/\/$/, '')}/files/assetFile/upload`, {
      headers: {
        Authorization: authorizationHeader,
      },
      body: form,
    })
    .json<{ id: string; src: string }>();

  if (!body.id || !body.src) {
    throw new Error(`Unexpected asset upload response for "${src}"`);
  }

  return { id: body.id, src: body.src };
}
