import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, test } from 'vitest';

import { readRepoFile, repoRoot } from './lib/repo-files.ts';

/**
 * The one file allowed to name a literal color.
 *
 * Every `@theme` chain has to bottom out somewhere for hosts that send no style
 * variables, and that somewhere is here. Anywhere else a literal means a view
 * has stopped following the host.
 */
const THEME_STYLESHEET = 'packages/mcp/mcp-server-base/src/ui/theme.css';

/** CSS length units that indicate an arbitrary value is off the spacing scale. */
const LENGTH_UNITS = [
  'px',
  'rem',
  'em',
  'vh',
  'vw',
  'vmin',
  'vmax',
  'ch',
  'ex',
  'pt',
  'pc',
  'cm',
  'mm',
  'q',
  'in',
];

const LENGTH_PATTERN = new RegExp(
  String.raw`(?:^|[\s,(/_])-?\.?\d[\d.]*(?:${LENGTH_UNITS.join('|')})\b`,
  'i',
);

const COLOR_FUNCTIONS = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\(/i;

/** Matches `#rgb`, `#rgba`, `#rrggbb`, and `#rrggbbaa`, but not a longer word. */
const HEX_LITERAL = /#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})\b/i;

/** Matches the `[…]` payload of a Tailwind arbitrary value, e.g. the `12px` of `p-[12px]`. */
const ARBITRARY_VALUE = /-\[([^\]]+)\]/g;

/**
 * Why an arbitrary value is disallowed, or `undefined` when it is fine.
 *
 * Only colors and lengths are rejected. Structural values have no theme
 * namespace to live in — `grid-cols-[max-content_1fr]` cannot be expressed any
 * other way — so banning every arbitrary value would just push views back to
 * handwritten CSS.
 */
function describeArbitraryValue(value: string): string | undefined {
  if (HEX_LITERAL.test(value) || COLOR_FUNCTIONS.test(value)) {
    return 'a literal color';
  }
  if (/^var\(--color-/.test(value)) {
    // Reaching for the variable directly skips the utility that already exists
    // for it, and skips the host fallback chain behind it.
    return 'a raw color variable';
  }
  if (LENGTH_PATTERN.test(value)) {
    return 'an off-scale length';
  }
  return undefined;
}

/**
 * Every `.tsx` and `.css` file under an MCP package's `src/ui` directory.
 *
 * Both roots are searched because the reference views live in `dev/`, and these
 * rules are exactly the ones a reference implementation has to keep.
 */
function findViewFiles(): string[] {
  const roots = [join(repoRoot, 'packages/mcp'), join(repoRoot, 'dev')];
  const found: string[] = [];

  function walk(directory: string): void {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const entryPath = join(directory, entry.name);
      if (entry.isDirectory()) {
        // `generated/` holds built single-file documents, which contain the
        // compiled output of these rules rather than authored source.
        if (entry.name !== 'generated' && entry.name !== 'node_modules') {
          walk(entryPath);
        }
      } else if (/\.(?:tsx|css)$/.test(entry.name)) {
        found.push(relative(repoRoot, entryPath));
      }
    }
  }

  for (const root of roots) {
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      try {
        walk(join(root, entry.name, 'src/ui'));
      } catch {
        // Most MCP packages ship no views.
      }
      // Cross-package presentational UI lives at `src/`, not under `src/ui/`.
      if (entry.name === 'mcp-app-ui') {
        walk(join(root, entry.name, 'src'));
      }
    }
  }

  return found.sort();
}

const viewFiles = findViewFiles();

describe('MCP app styling', () => {
  test('there are view files to check', () => {
    // Guards against the walk silently finding nothing and every case below
    // passing vacuously.
    expect(viewFiles).toContain(THEME_STYLESHEET);
    expect(viewFiles.length).toBeGreaterThan(1);
  });

  test.for(viewFiles)('%s uses no arbitrary color or length values', (filePath) => {
    const offenders = [...readRepoFile(filePath).matchAll(ARBITRARY_VALUE)].flatMap((match) => {
      const reason = describeArbitraryValue(match[1] ?? '');
      return reason ? [`${match[0]} is ${reason}`] : [];
    });

    expect(offenders, `Use a theme value instead, or add one to ${THEME_STYLESHEET}`).toEqual([]);
  });

  test.for(viewFiles.filter((filePath) => filePath !== THEME_STYLESHEET))(
    '%s names no literal colors',
    (filePath) => {
      const offendingLines = readRepoFile(filePath)
        .split('\n')
        .flatMap((line, index) => {
          const match = HEX_LITERAL.exec(line);
          return match ? [`line ${index + 1}: ${match[0]}`] : [];
        });

      expect(
        offendingLines,
        `Colors belong in the @theme block of ${THEME_STYLESHEET}, where they can fall back to a host value`,
      ).toEqual([]);
    },
  );

  test('the rules catch what they are meant to catch', () => {
    // These assertions are the specification, since a passing scan above proves
    // nothing on its own about whether the patterns match anything at all.
    expect(describeArbitraryValue('#fff')).toBe('a literal color');
    expect(describeArbitraryValue('rgb(0_0_0)')).toBe('a literal color');
    expect(describeArbitraryValue('var(--color-surface)')).toBe('a raw color variable');
    expect(describeArbitraryValue('20px')).toBe('an off-scale length');
    expect(describeArbitraryValue('1.5rem')).toBe('an off-scale length');
    expect(describeArbitraryValue('calc(100%_-_4px)')).toBe('an off-scale length');

    // Structural values stay legal.
    expect(describeArbitraryValue('max-content_1fr')).toBeUndefined();
    expect(describeArbitraryValue('&>svg')).toBeUndefined();
    expect(describeArbitraryValue('auto_1fr')).toBeUndefined();

    expect(HEX_LITERAL.test('#f4f4f6')).toBe(true);
    expect(HEX_LITERAL.test('id="hello-name"')).toBe(false);
  });
});
