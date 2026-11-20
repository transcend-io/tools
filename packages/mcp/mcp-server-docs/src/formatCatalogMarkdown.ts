import type { CatalogIntegrationDetail } from './catalogGraphql.js';

function section(title: string, body: string | undefined): string {
  if (!body?.trim()) {
    return '';
  }
  return `## ${title}\n\n${body.trim()}\n\n`;
}

function listLines(items: string[]): string {
  if (!items.length) {
    return '_None listed._\n\n';
  }
  return items.map((item) => `- ${item}`).join('\n') + '\n\n';
}

/** Render signed-in catalog metadata as markdown for agents. */
export function formatCatalogIntegrationMarkdown(
  catalog: CatalogIntegrationDetail,
  options: { publicGuideUrl?: string } = {},
): string {
  const publicGuideUrl = options.publicGuideUrl;
  const datapoints =
    catalog.dataPoints.length > 0
      ? catalog.dataPoints
          .map(
            (dp) =>
              `- **${dp.title || dp.name}** (\`${dp.name}\`): ${dp.description}` +
              (dp.allowedActions.length ? ` — actions: ${dp.allowedActions.join(', ')}` : ''),
          )
          .join('\n') + '\n\n'
      : '_No default datapoints._\n\n';

  const plaintext =
    catalog.plaintextInformation.length > 0
      ? catalog.plaintextInformation
          .map((row) => `- \`${row.path}\` (${row.types.join(', ')})`)
          .join('\n') + '\n\n'
      : '';

  const lines = [
    `# ${catalog.title} (\`${catalog.integrationName}\`)`,
    '',
    catalog.description.trim(),
    '',
    section('Overview', catalog.businessUserOverviewMarkdown),
    section('Connection', catalog.introMessageMarkdown),
    '## Supported request actions',
    '',
    listLines(catalog.allowedActions),
    '## Default datapoints',
    '',
    datapoints,
  ];

  if (plaintext) {
    lines.push('## Plaintext paths', '', plaintext);
  }

  lines.push(
    '## Minimum Sombra version',
    '',
    catalog.minimumSombraVersion || '_Not specified._',
    '',
  );

  if (publicGuideUrl) {
    lines.push('## Public guide', '', `[${publicGuideUrl}](${publicGuideUrl})`, '');
  }

  return lines.join('\n');
}
