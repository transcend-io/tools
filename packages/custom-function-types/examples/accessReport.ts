import type { CustomFunction } from '@transcend-io/custom-function-types';

/**
 * Build a one-page HTML summary of an access request from the archive files.
 *
 * Requires Sombra 7.656.0 or later.
 *
 * @param argument - Services and payload provided for the datapoint invocation
 */
export default async function customFunction({
  payload,
  sdk,
}: CustomFunction.Argument): Promise<void> {
  const files = await sdk.listRequestFiles({
    excludeDataSiloIds: [payload.extras.dataSilo.id],
  });
  const theme = await sdk.getPrivacyCenterTheme();

  const rows = files
    .map(
      (file) =>
        `<tr><td>${sdk.utils.escapeHtml(file.fileName)}</td><td>${sdk.utils.formatBytes(file.size)}</td></tr>`,
    )
    .join('');

  await sdk.uploadDataPoint({
    dataPointName: 'report',
    archivePath: 'index.html',
    contentType: 'text/html',
    body: `<body style="border-top: 4px solid ${sdk.utils.escapeHtml(theme.primary)}"><table>${rows}</table></body>`,
  });
  await sdk.markDataSiloComplete();
}
