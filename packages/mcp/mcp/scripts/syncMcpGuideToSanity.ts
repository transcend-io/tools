/**
 * Draft-sync MCP package tool counts into Sanity docs articles.
 *
 * Updates:
 * - MCP Guide package/tools table
 * - MCP Guide "all N tools" prose
 * - Cursor setup "N tools" prose
 *
 * By default writes drafts only. Pass `--publish` to publish after patching.
 *
 * Requires SANITY_API_TOKEN (Editor write). See packages/mcp/DEPLOYMENT.md.
 *
 * Usage:
 *   pnpm --dir packages/mcp/mcp sync:sanity
 *   pnpm --dir packages/mcp/mcp sync:sanity -- --dry-run
 *   pnpm --dir packages/mcp/mcp sync:sanity -- --publish
 *   pnpm --dir packages/mcp/mcp sync:sanity -- --discover
 */
import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import { join } from 'node:path';
import { stdin as input, stdout as output } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

import { createClient, type SanityClient } from '@sanity/client';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const syncJsonPath = join(packageRoot, 'docs', 'mcp-guide-sync.json');

const SANITY_PROJECT_ID = '1ievmmav';
const SANITY_DATASET = 'production';
const SANITY_API_VERSION = '2025-02-19';

/** Published article IDs and content keys discovered from the production dataset. */
const MCP_GUIDE = {
  articleId: '5f179e98-0163-43e6-94c5-e0b9fffcb185',
  finalSlug: 'artificial-intelligence/mcp-guide',
  packagesTableKey: 'b5bc91c564f0',
  toolTotalBlockKey: '19f9863cfd60',
} as const;

const CURSOR_SETUP = {
  articleId: 'ee8309b4-2022-4929-80e2-fb80e53633dd',
  finalSlug: 'artificial-intelligence/mcp-cursor-setup',
  toolTotalBlockKey: '29befe1e0228',
} as const;

interface SyncPackage {
  id: string;
  npmName: string;
  toolCount: number | null;
  domain: string;
}

interface SyncPayload {
  umbrellaToolCount: number;
  packages: SyncPackage[];
}

interface PortableSpan {
  _type: 'span';
  _key: string;
  text: string;
  marks: string[];
}

interface PortableBlock {
  _type: 'block';
  _key: string;
  style: 'normal';
  markDefs: Array<Record<string, unknown>>;
  children: PortableSpan[];
}

interface TableCell {
  _type: 'tableCell';
  _key: string;
  content: PortableBlock[];
}

interface TableRow {
  _type: 'tableRow';
  _key: string;
  cells: TableCell[];
}

interface TableBlock {
  _type: 'table';
  _key: string;
  isFirstRowHeader: boolean;
  rows: TableRow[];
}

const args = new Set(process.argv.slice(2).filter((arg) => arg !== '--'));
const dryRun = args.has('--dry-run');
const discoverOnly = args.has('--discover');
const shouldPublish = args.has('--publish');

function key(seed?: string): string {
  if (seed) {
    return createHash('sha1').update(seed).digest('hex').slice(0, 12);
  }
  return randomBytes(6).toString('hex');
}

function textBlock(
  text: string,
  marks: string[] = [],
  markDefs: PortableBlock['markDefs'] = [],
): PortableBlock {
  return {
    _type: 'block',
    _key: key(),
    style: 'normal',
    markDefs,
    children: [
      {
        _type: 'span',
        _key: key(),
        text,
        marks,
      },
    ],
  };
}

function headerCell(label: string): TableCell {
  return {
    _type: 'tableCell',
    _key: key(`header:${label}`),
    content: [textBlock(label, ['strong'])],
  };
}

function plainCell(text: string): TableCell {
  return {
    _type: 'tableCell',
    _key: key(),
    content: [textBlock(text)],
  };
}

function npmPackageCell(npmName: string): TableCell {
  const linkKey = key(`link:${npmName}`);
  return {
    _type: 'tableCell',
    _key: key(`cell:${npmName}`),
    content: [
      {
        _type: 'block',
        _key: key(`block:${npmName}`),
        style: 'normal',
        markDefs: [
          {
            _key: linkKey,
            _type: 'richTextLink',
            link: [
              {
                _key: key(`ext:${npmName}`),
                _type: 'richTextExternalLink',
                newTab: true,
                url: `https://www.npmjs.com/package/${npmName}`,
              },
            ],
          },
        ],
        children: [
          {
            _type: 'span',
            _key: key(`span:${npmName}`),
            text: npmName,
            marks: ['code', linkKey],
          },
        ],
      },
    ],
  };
}

function buildPackagesTable(packages: SyncPackage[], tableKey: string): TableBlock {
  const guidePackages = packages.filter((pkg) => pkg.id !== 'base' && pkg.toolCount !== null);
  const header: TableRow = {
    _type: 'tableRow',
    _key: key('header-row'),
    cells: [headerCell('Package'), headerCell('Tools'), headerCell('Domain')],
  };
  const rows: TableRow[] = [
    header,
    ...guidePackages.map((pkg) => ({
      _type: 'tableRow' as const,
      _key: key(`row:${pkg.npmName}`),
      cells: [npmPackageCell(pkg.npmName), plainCell(String(pkg.toolCount)), plainCell(pkg.domain)],
    })),
  ];
  return {
    _type: 'table',
    _key: tableKey,
    isFirstRowHeader: true,
    rows,
  };
}

function replaceToolCountInText(text: string, total: number): string {
  const replaced = text
    .replace(/\ball \d+ tools\b/g, `all ${total} tools`)
    .replace(/\bwith \d+ tools\b/g, `with ${total} tools`)
    .replace(/\b\d+ tools\b/g, `${total} tools`);
  if (replaced === text && !text.includes(String(total))) {
    throw new Error(`Could not update tool count in prose: ${JSON.stringify(text)}`);
  }
  return replaced;
}

function patchBlockText(block: Record<string, unknown>, total: number): Record<string, unknown> {
  const children = block.children;
  if (!Array.isArray(children)) {
    throw new Error(`Block ${block._key} has no children`);
  }
  const fullText = children
    .map((child) =>
      typeof child === 'object' && child && 'text' in child ? String(child.text) : '',
    )
    .join('');
  const nextText = replaceToolCountInText(fullText, total);

  // Prefer rewriting a single text span when the block is a single span (common case).
  if (children.length === 1 && typeof children[0] === 'object' && children[0]) {
    return {
      ...block,
      markDefs: Array.isArray(block.markDefs) ? block.markDefs : [],
      children: [
        {
          ...children[0],
          text: nextText,
          marks: Array.isArray((children[0] as { marks?: unknown }).marks)
            ? (children[0] as { marks: string[] }).marks
            : [],
        },
      ],
    };
  }

  return {
    ...block,
    markDefs: Array.isArray(block.markDefs) ? block.markDefs : [],
    children: [
      {
        _type: 'span',
        _key: key(),
        text: nextText,
        marks: [],
      },
    ],
  };
}

async function resolveToken(optional = false): Promise<string | undefined> {
  const fromEnv = process.env.SANITY_API_TOKEN?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  if (optional) {
    return undefined;
  }
  if (!process.stdin.isTTY) {
    throw new Error(
      'SANITY_API_TOKEN is required. Create an Editor token at https://www.sanity.io/manage and export it, or store it as a GitHub Actions secret.',
    );
  }
  const rl = createInterface({ input, output });
  try {
    const token = (await rl.question('Sanity API token (Editor write): ')).trim();
    if (!token) {
      throw new Error('Empty token');
    }
    return token;
  } finally {
    rl.close();
  }
}

function draftId(publishedId: string): string {
  return publishedId.startsWith('drafts.') ? publishedId : `drafts.${publishedId}`;
}

async function ensureDraft(client: SanityClient, publishedId: string): Promise<string> {
  const id = draftId(publishedId);
  const existing = await client.getDocument(id);
  if (existing) {
    return id;
  }
  const published = await client.getDocument(publishedId);
  if (!published) {
    throw new Error(`Published document not found: ${publishedId}`);
  }
  const { _rev: _ignored, ...rest } = published;
  await client.createOrReplace({ ...rest, _id: id });
  return id;
}

async function discover(client: SanityClient | null): Promise<void> {
  const fetchFn =
    client?.fetch.bind(client) ??
    (async (query: string, params: Record<string, string>) => {
      const url = new URL(
        `https://${SANITY_PROJECT_ID}.api.sanity.io/v${SANITY_API_VERSION}/data/query/${SANITY_DATASET}`,
      );
      url.searchParams.set('query', query);
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(`$${key}`, JSON.stringify(value));
      }
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Sanity query failed: ${response.status} ${await response.text()}`);
      }
      const body = (await response.json()) as { result: unknown };
      return body.result;
    });

  for (const article of [MCP_GUIDE, CURSOR_SETUP]) {
    const doc = await fetchFn(
      `*[_type == "article" && finalSlug.current == $slug][0]{
        _id,
        title,
        "tables": content[_type == "table"]{_key, "rowCount": count(rows), "header": pt::text(rows[0])},
        "toolMentions": content[_type == "block"]{_key, "text": pt::text(@)}[text match "*tool*"]
      }`,
      { slug: article.finalSlug },
    );
    console.log(`# ${article.finalSlug}`);
    console.log(JSON.stringify(doc, null, 2));
    console.log(`Configured keys: ${JSON.stringify(article, null, 2)}`);
  }
}

function blockPlainText(block: Record<string, unknown> | undefined): string {
  if (!block || !Array.isArray(block.children)) {
    return '';
  }
  return block.children
    .map((child) =>
      typeof child === 'object' && child && 'text' in child ? String(child.text) : '',
    )
    .join('');
}

function tablePlainRows(table: Record<string, unknown> | TableBlock | undefined): string[] {
  if (!table || !Array.isArray((table as { rows?: unknown }).rows)) {
    return [];
  }
  return (
    table as { rows: Array<{ cells?: Array<{ content?: Array<Record<string, unknown>> }> }> }
  ).rows.map((row) =>
    (row.cells ?? []).map((cell) => blockPlainText(cell.content?.[0])).join(' | '),
  );
}

function printDiff(label: string, before: string, after: string): void {
  console.log(`\n## ${label}`);
  if (before === after) {
    console.log('(unchanged)');
    return;
  }
  console.log(`- ${before}`);
  console.log(`+ ${after}`);
}

function printTableDiff(label: string, beforeRows: string[], afterRows: string[]): void {
  console.log(`\n## ${label}`);
  const max = Math.max(beforeRows.length, afterRows.length);
  let changed = 0;
  for (let i = 0; i < max; i += 1) {
    const before = beforeRows[i] ?? '(missing row)';
    const after = afterRows[i] ?? '(missing row)';
    if (before === after) {
      console.log(`  ${before}`);
      continue;
    }
    changed += 1;
    console.log(`- ${before}`);
    console.log(`+ ${after}`);
  }
  console.log(`(${changed} row(s) changed)`);
}

async function main(): Promise<void> {
  if (dryRun && shouldPublish) {
    throw new Error('Cannot combine --dry-run and --publish');
  }

  const payload = JSON.parse(fs.readFileSync(syncJsonPath, 'utf8')) as SyncPayload;

  if (discoverOnly) {
    const token = await resolveToken(true);
    const client = token
      ? createClient({
          projectId: SANITY_PROJECT_ID,
          dataset: SANITY_DATASET,
          apiVersion: SANITY_API_VERSION,
          token,
          useCdn: false,
        })
      : null;
    await discover(client);
    return;
  }

  const table = buildPackagesTable(payload.packages, MCP_GUIDE.packagesTableKey);
  const afterTableRows = tablePlainRows(table);

  if (dryRun) {
    const token = await resolveToken(true);
    const client = token
      ? createClient({
          projectId: SANITY_PROJECT_ID,
          dataset: SANITY_DATASET,
          apiVersion: SANITY_API_VERSION,
          token,
          useCdn: false,
        })
      : createClient({
          projectId: SANITY_PROJECT_ID,
          dataset: SANITY_DATASET,
          apiVersion: SANITY_API_VERSION,
          useCdn: true,
        });

    // Read published (or existing draft) without createOrReplace — dry-run must not write.
    const guideId = draftId(MCP_GUIDE.articleId);
    const cursorId = draftId(CURSOR_SETUP.articleId);
    const guideDoc =
      (await client.getDocument(guideId)) ?? (await client.getDocument(MCP_GUIDE.articleId));
    const cursorDoc =
      (await client.getDocument(cursorId)) ?? (await client.getDocument(CURSOR_SETUP.articleId));
    if (!guideDoc?.content || !cursorDoc?.content) {
      throw new Error('Could not load MCP Guide / Cursor setup documents for dry-run preview');
    }

    const guideContent = guideDoc.content as Array<Record<string, unknown>>;
    const cursorContent = cursorDoc.content as Array<Record<string, unknown>>;
    const currentTable = guideContent.find((block) => block._key === MCP_GUIDE.packagesTableKey);
    const guideToolBlock = guideContent.find((block) => block._key === MCP_GUIDE.toolTotalBlockKey);
    const cursorToolBlock = cursorContent.find(
      (block) => block._key === CURSOR_SETUP.toolTotalBlockKey,
    );
    if (!guideToolBlock || !cursorToolBlock) {
      throw new Error('Could not find tool-total prose blocks — re-run with --discover');
    }

    const nextGuideBlock = patchBlockText(guideToolBlock, payload.umbrellaToolCount);
    const nextCursorBlock = patchBlockText(cursorToolBlock, payload.umbrellaToolCount);

    console.log('Dry run preview (no mutations written)');
    printTableDiff(
      `MCP Guide table (${MCP_GUIDE.packagesTableKey})`,
      tablePlainRows(currentTable),
      afterTableRows,
    );
    printDiff(
      `MCP Guide prose (${MCP_GUIDE.toolTotalBlockKey})`,
      blockPlainText(guideToolBlock),
      blockPlainText(nextGuideBlock),
    );
    printDiff(
      `Cursor setup prose (${CURSOR_SETUP.toolTotalBlockKey})`,
      blockPlainText(cursorToolBlock),
      blockPlainText(nextCursorBlock),
    );
    return;
  }

  const token = await resolveToken(false);
  if (!token) {
    throw new Error('SANITY_API_TOKEN is required');
  }

  const client = createClient({
    projectId: SANITY_PROJECT_ID,
    dataset: SANITY_DATASET,
    apiVersion: SANITY_API_VERSION,
    token,
    useCdn: false,
  });

  const guideDraft = await ensureDraft(client, MCP_GUIDE.articleId);
  const cursorDraft = await ensureDraft(client, CURSOR_SETUP.articleId);

  const guideDoc = await client.getDocument(guideDraft);
  const cursorDoc = await client.getDocument(cursorDraft);
  if (!guideDoc?.content || !cursorDoc?.content) {
    throw new Error('Draft documents missing content arrays');
  }

  const guideToolBlock = (guideDoc.content as Array<Record<string, unknown>>).find(
    (block) => block._key === MCP_GUIDE.toolTotalBlockKey,
  );
  const cursorToolBlock = (cursorDoc.content as Array<Record<string, unknown>>).find(
    (block) => block._key === CURSOR_SETUP.toolTotalBlockKey,
  );
  if (!guideToolBlock || !cursorToolBlock) {
    throw new Error('Could not find tool-total prose blocks — re-run with --discover');
  }

  const nextGuideBlock = patchBlockText(guideToolBlock, payload.umbrellaToolCount);
  const nextCursorBlock = patchBlockText(cursorToolBlock, payload.umbrellaToolCount);

  console.log(`MCP Guide draft: ${guideDraft}`);
  console.log(
    `  table ${MCP_GUIDE.packagesTableKey} → ${table.rows.length - 1} packages (umbrella=${payload.umbrellaToolCount})`,
  );
  console.log(`  prose ${MCP_GUIDE.toolTotalBlockKey} updated`);
  console.log(`Cursor setup draft: ${cursorDraft}`);
  console.log(`  prose ${CURSOR_SETUP.toolTotalBlockKey} updated`);

  await client
    .transaction()
    .patch(guideDraft, (p) =>
      p
        .set({ [`content[_key=="${MCP_GUIDE.packagesTableKey}"]`]: table })
        .set({ [`content[_key=="${MCP_GUIDE.toolTotalBlockKey}"]`]: nextGuideBlock }),
    )
    .patch(cursorDraft, (p) =>
      p.set({ [`content[_key=="${CURSOR_SETUP.toolTotalBlockKey}"]`]: nextCursorBlock }),
    )
    .commit({ visibility: 'sync' });

  if (shouldPublish) {
    await client.action([
      {
        actionType: 'sanity.action.document.publish',
        draftId: guideDraft,
        publishedId: MCP_GUIDE.articleId,
      },
      {
        actionType: 'sanity.action.document.publish',
        draftId: cursorDraft,
        publishedId: CURSOR_SETUP.articleId,
      },
    ]);
    console.log('Published MCP Guide and Cursor setup.');
    console.log(`  MCP Guide: https://docs.transcend.io/docs/articles/${MCP_GUIDE.finalSlug}`);
    console.log(
      `  Cursor setup: https://docs.transcend.io/docs/articles/${CURSOR_SETUP.finalSlug}`,
    );
    return;
  }

  console.log('Drafts updated. Review and publish in Sanity Studio:');
  console.log(
    `  https://www.sanity.io/manage/project/${SANITY_PROJECT_ID}/dataset/${SANITY_DATASET}`,
  );
  console.log(`  MCP Guide: https://docs.transcend.io/docs/articles/${MCP_GUIDE.finalSlug}`);
  console.log(`  Cursor setup: https://docs.transcend.io/docs/articles/${CURSOR_SETUP.finalSlug}`);
  console.log('Or re-run with --publish to publish immediately after patching.');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
