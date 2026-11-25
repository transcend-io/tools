import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * This repo is public. PR titles, bodies, and comments must not carry customer names, internal
 * links, or customer identifiers. The scanner keeps no customer name list, so it only catches
 * what has a recognizable shape. The repo rule `public-pr-content.mdc` covers the rest.
 *
 * Keep this file free of dependencies: the PR content workflow runs it from a sparse checkout.
 */

/** One piece of text that should not be posted to a public PR. */
export type PrContentFinding = {
  /** Short rule id, such as `internal-link`. */
  rule: string;
  /** One-based line number in the scanned text. */
  line: number;
  /** Masked match. Never the full value, because CI logs are public too. */
  preview: string;
  /** What to do instead. */
  hint: string;
};

type Rule = {
  /** Short rule id. */
  id: string;
  /** Global pattern. Every match becomes a finding unless `isAllowed` accepts it. */
  pattern: RegExp;
  /** What to do instead. */
  hint: string;
  /** Return true to accept a match on this line. */
  isAllowed?: (match: string, lineText: string) => boolean;
};

const INTERNAL_LINK_HOSTS = [
  String.raw`[a-z0-9-]+\.slack\.com`,
  String.raw`app\.retoolcloud\.transcend\.io`,
  String.raw`[a-z0-9.-]*gong\.io`,
  String.raw`[a-z0-9.-]*intercom\.(?:com|io)`,
  String.raw`(?!docs\.)[a-z0-9.-]*datadoghq\.(?:com|eu)`,
  String.raw`[a-z0-9.-]*notion\.(?:so|site)`,
  String.raw`(?:docs|drive)\.google\.com`,
  String.raw`[a-z0-9.-]*(?:lightning\.force|my\.salesforce)\.com`,
];

const ALLOWED_EMAIL_DOMAINS = new Set([
  'transcend.io',
  'example.com',
  'example.org',
  'example.net',
  'github.com',
  'users.noreply.github.com',
  'noreply.github.com',
]);

const RULES: Rule[] = [
  {
    id: 'internal-link',
    pattern: new RegExp(
      String.raw`https?://(?:${INTERNAL_LINK_HOSTS.join('|')})(?:[/?#][^\s)\]>"']*)?`,
      'gi',
    ),
    hint: 'Remove internal links (Slack, Retool, Gong, Intercom, Datadog, Notion, Google Docs). Keep the evidence in Linear or Slack.',
  },
  {
    id: 'admin-dashboard-link',
    pattern: /https?:\/\/[a-z0-9.-]*transcend\.io\/admin[^\s)\]>"']*/gi,
    hint: 'Remove admin dashboard links. They point at a specific customer or request.',
  },
  {
    id: 'linear-slug-link',
    pattern: /https?:\/\/linear\.app\/[^/\s]+\/issue\/[a-z]+-\d+\/[^\s)\]>"']+/gi,
    hint: 'Use the bare ticket ID (for example SUP-368). The URL slug is the ticket title, which can name a customer.',
  },
  {
    id: 'uuid',
    pattern: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
    hint: 'Remove IDs. Org, request, and data silo IDs identify a customer.',
    isAllowed: (_match, lineText) => /cursor\.com\/agents\/|bcId=/i.test(lineText),
  },
  {
    id: 'email',
    pattern: /[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}\b/gi,
    hint: 'Remove email addresses. Use a placeholder such as user@example.com.',
    isAllowed: (match, _lineText) => {
      const domain = match.slice(match.lastIndexOf('@') + 1).toLowerCase();
      return ALLOWED_EMAIL_DOMAINS.has(domain) || domain.endsWith('.transcend.io');
    },
  },
];

/**
 * Scan text for content that must not go into a public PR.
 *
 * @param text - Title, body, comment, or a whole `gh` command line
 * @returns One finding per match, in line order
 */
export function findPrContentIssues(text: string): PrContentFinding[] {
  const findings: PrContentFinding[] = [];
  const lines = text.split(/\r?\n/);

  lines.forEach((lineText, index) => {
    for (const rule of RULES) {
      for (const [match] of lineText.matchAll(rule.pattern)) {
        if (rule.isAllowed?.(match, lineText)) {
          continue;
        }
        findings.push({
          rule: rule.id,
          line: index + 1,
          preview: maskMatch(match),
          hint: rule.hint,
        });
      }
    }
  });

  return findings;
}

/**
 * Format findings as one block per finding for logs and hook messages.
 *
 * @param findings - Output of {@link findPrContentIssues}
 * @returns Multi-line text
 */
export function formatPrContentFindings(findings: PrContentFinding[]): string {
  return findings
    .map(({ rule, line, preview, hint }) => `- line ${line} [${rule}] ${preview}\n  ${hint}`)
    .join('\n');
}

const GH_PR_WRITE_COMMAND = /\bgh\s+pr\s+(?:create|edit|comment|review)\b/;
const BODY_FILE_FLAG = /(?:--body-file|-F)(?:=|\s+)(?:"([^"]+)"|'([^']+)'|([^\s"';&|]+))/g;

/**
 * Whether a shell command writes PR text through `gh`.
 *
 * @param command - Shell command line
 * @returns True for `gh pr create|edit|comment|review`
 */
export function isGhPrWriteCommand(command: string): boolean {
  return GH_PR_WRITE_COMMAND.test(command);
}

/**
 * Collect all text a `gh pr` command would post: the command line itself (inline `--body`,
 * `--title`, heredocs) plus the contents of any `--body-file` or `-F` file.
 *
 * @param command - Shell command line
 * @param cwd - Directory the command runs in, used to resolve relative file paths
 * @returns Text to scan
 */
export function collectGhPrText(command: string, cwd: string): string {
  const chunks = [command];

  for (const [, doubleQuoted, singleQuoted, bare] of command.matchAll(BODY_FILE_FLAG)) {
    const path = doubleQuoted ?? singleQuoted ?? bare;
    if (!path || path === '-') {
      continue;
    }
    const absolutePath = resolve(cwd, path);
    if (existsSync(absolutePath)) {
      chunks.push(readFileSync(absolutePath, 'utf8'));
    }
  }

  return chunks.join('\n');
}

function maskMatch(match: string): string {
  const visible = Math.min(8, Math.floor(match.length / 3));
  return `${match.slice(0, visible)}${'*'.repeat(Math.min(12, match.length - visible))}`;
}
