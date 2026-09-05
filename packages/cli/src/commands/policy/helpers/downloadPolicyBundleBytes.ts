import got from 'got';

/** HTTP dependency used to download policy bundle bytes. */
export interface DownloadPolicyBundleBytesDependencies {
  /** Downloads the response body at a presigned URL as bytes. */
  readonly getBuffer: (url: string) => Promise<Uint8Array>;
}

const defaultDependencies: DownloadPolicyBundleBytesDependencies = {
  getBuffer: async (url) => got(url).buffer(),
};

/**
 * Downloads a compiled policy bundle from a presigned URL.
 *
 * @param url - Presigned policy bundle URL
 * @param dependencies - HTTP dependency used to download the response body
 * @returns Downloaded policy bundle bytes
 */
export async function downloadPolicyBundleBytes(
  url: string,
  dependencies: DownloadPolicyBundleBytesDependencies = defaultDependencies,
): Promise<Uint8Array> {
  try {
    return await dependencies.getBuffer(url);
  } catch (err) {
    throw new Error(
      `Failed to download policy bundle from the presigned URL: ${
        err instanceof Error ? err.message : String(err)
      }`,
      { cause: err },
    );
  }
}
