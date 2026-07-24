import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { color, palette, type ColorMode, type SemanticColors } from './index.js';

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

  test('generates CSS custom properties on :root', () => {
    const css = readFileSync(join(packageRoot, 'dist/tokens.css'), 'utf8');
    expect(css).toContain(':root {');
    expect(css).toContain('--palette-gray-500:');
    expect(css).toContain('--text-default: var(--palette-gray-900)');
    expect(css).toContain('--text: var(--text-default)');
    expect(css).toContain('--background-brand-bold-default:');
    expect(css).toContain('--background-brand-bold: var(--background-brand-bold-default)');
    expect(css).not.toContain('[data-theme="dark"]');
    expect(css).not.toContain('prefers-color-scheme');
  });
});
