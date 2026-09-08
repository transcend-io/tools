import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { color, palette, typography, type ColorMode, type SemanticColors } from './index.js';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('@transcend-io/design-tokens', () => {
  test('exports light and dark semantic color modes', () => {
    expect(color.light.background).toBeDefined();
    expect(color.dark.background).toBeDefined();
  });

  test('exports primitive palette scales', () => {
    expect(palette.gray['500']).toMatch(/^#[0-9a-f]{6}$/i);
  });

  test('exports drop-in color types for theme consumers', () => {
    const mode: ColorMode = 'light';
    const colors: SemanticColors = color[mode];
    expect(colors.text).toBeDefined();
  });

  test('rest-state groups expose default and stringify to it', () => {
    const bold = color.light.background.brand.bold;
    expect(bold.default).toMatch(/^#/i);
    expect(String(bold)).toBe(bold.default);
    expect(bold.hovered).toMatch(/^#/i);
  });

  test('category roles keep named default leaves', () => {
    expect(color.light.text.default).toMatch(/^#/i);
    expect(color.light.link.default).toMatch(/^#/i);
    expect(color.light.border.default).toMatch(/^#/i);
  });

  test('exports semantic typography styles', () => {
    expect(typography.light.body.md.fontFamily).toBe('Figtree, system-ui, sans-serif');
    expect(typography.light.display.lg.fontSize).toBe('32px');
    // Multi-word families are CSS-quoted inside the fallback stack.
    expect(typography.light.code.md.fontFamily).toBe('"Fragment Mono", ui-monospace, monospace');
    expect(typography.light.display.lg.fontFamily).toBe('"GT Planar VF", system-ui, sans-serif');
  });

  test('generates CSS custom properties on :root', () => {
    const css = readFileSync(join(packageRoot, 'dist/tokens.css'), 'utf8');
    expect(css).toContain(':root {');
    expect(css).toContain('--palette-gray-500:');
    expect(css).toContain('--text-default: var(--palette-gray-900)');
    expect(css).toContain('--text: var(--text-default)');
    // Rest state is a named `default` leaf with a short CSS alias.
    expect(css).toContain('--background-brand-bold-default:');
    expect(css).toContain('--background-brand-bold: var(--background-brand-bold-default)');
    expect(css).toContain('--background-brand-bold-hovered:');
    expect(css).not.toContain('--background-brand-bold-$root');
    expect(css).not.toContain('[data-theme="dark"]');
    expect(css).not.toContain('prefers-color-scheme');
  });

  test('exports raw DTCG token sources for custom pipelines', () => {
    const pkg = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')) as {
      files: string[];
      exports: Record<string, unknown>;
    };
    expect(pkg.files).toContain('tokens');
    expect(pkg.exports['./tokens']).toBe('./tokens/tokens.resolver.json');
    expect(pkg.exports['./tokens/semantic/typography.tokens.json']).toBe(
      './tokens/semantic/typography.tokens.json',
    );

    const resolver = JSON.parse(
      readFileSync(join(packageRoot, 'tokens/tokens.resolver.json'), 'utf8'),
    ) as {
      sets: Record<string, unknown>;
    };
    expect(resolver.sets.primitives).toBeDefined();
    expect(resolver.sets.colors).toBeDefined();
    expect(resolver.sets.typography).toBeDefined();

    for (const relative of [
      'tokens/primitive/palette.tokens.json',
      'tokens/semantic/color.tokens.json',
      'tokens/semantic/color-dark.tokens.json',
      'tokens/semantic/typography.tokens.json',
    ]) {
      expect(() => JSON.parse(readFileSync(join(packageRoot, relative), 'utf8'))).not.toThrow();
    }
  });
});
