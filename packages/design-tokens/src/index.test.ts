import { describe, expect, test } from 'vitest';

import { color, palette, type ColorMode, type SemanticColors } from './index.js';

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
});
