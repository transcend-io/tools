import { describe, expect, it } from 'vitest';

import { DocsGuideType, parseDocsGuideType } from './docs.js';

describe('parseDocsGuideType', () => {
  it('returns a known guide type title', () => {
    expect(parseDocsGuideType(DocsGuideType.DeveloperDocs)).toBe(DocsGuideType.DeveloperDocs);
  });

  it('returns null for unknown or empty values', () => {
    expect(parseDocsGuideType('Future Guide Type')).toBeNull();
    expect(parseDocsGuideType('')).toBeNull();
    expect(parseDocsGuideType(null)).toBeNull();
  });
});
