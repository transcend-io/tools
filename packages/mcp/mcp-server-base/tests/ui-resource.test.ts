import { describe, expect, it } from 'vitest';

import {
  buildUiResourceMeta,
  defineUiResource,
  readUiResourceHtml,
  type UiResourceDefinition,
} from '../src/tools/ui-resource.js';

const VALID_HTML = '<!DOCTYPE html><html><body>hi</body></html>';

describe('defineUiResource', () => {
  it('accepts a well-formed resource', () => {
    const resource = defineUiResource({
      uri: 'ui://test/view',
      name: 'Test view',
      html: VALID_HTML,
    });
    expect(resource.uri).toBe('ui://test/view');
  });

  it('rejects a uri that does not use the ui:// scheme', () => {
    expect(() =>
      defineUiResource({ uri: 'https://example.com/view', name: 'Test', html: VALID_HTML }),
    ).toThrow(/ui:\/\//);
  });

  it('rejects a uri with an empty path', () => {
    expect(() => defineUiResource({ uri: 'ui://', name: 'Test', html: VALID_HTML })).toThrow(
      /empty path/,
    );
  });

  it('rejects a blank name', () => {
    expect(() => defineUiResource({ uri: 'ui://test/view', name: '  ', html: VALID_HTML })).toThrow(
      /non-empty name/,
    );
  });

  it('rejects empty HTML', () => {
    expect(() => defineUiResource({ uri: 'ui://test/view', name: 'Test', html: '' })).toThrow(
      /empty HTML/,
    );
  });

  it('rejects an HTML fragment that is not a full document', () => {
    expect(() =>
      defineUiResource({ uri: 'ui://test/view', name: 'Test', html: '<div>hi</div>' }),
    ).toThrow(/complete HTML5 document/);
  });

  it('accepts a lowercase doctype with leading whitespace', () => {
    expect(() =>
      defineUiResource({ uri: 'ui://test/view', name: 'Test', html: '\n  <!doctype html><html>' }),
    ).not.toThrow();
  });

  it('does not validate a lazily produced document, which is only known at read time', () => {
    expect(() =>
      defineUiResource({
        uri: 'ui://test/lazy',
        name: 'Lazy view',
        html: async () => VALID_HTML,
      }),
    ).not.toThrow();
  });
});

describe('readUiResourceHtml', () => {
  it('returns literal HTML unchanged', async () => {
    const resource: UiResourceDefinition = { uri: 'ui://t/v', name: 'v', html: VALID_HTML };
    await expect(readUiResourceHtml(resource)).resolves.toBe(VALID_HTML);
  });

  it('invokes the factory form on each read', async () => {
    let calls = 0;
    const resource: UiResourceDefinition = {
      uri: 'ui://t/v',
      name: 'v',
      html: async () => {
        calls += 1;
        return `${VALID_HTML}<!--${calls}-->`;
      },
    };
    await expect(readUiResourceHtml(resource)).resolves.toContain('<!--1-->');
    await expect(readUiResourceHtml(resource)).resolves.toContain('<!--2-->');
  });
});

describe('buildUiResourceMeta', () => {
  it('returns undefined when there is nothing to declare', () => {
    expect(buildUiResourceMeta({ uri: 'ui://t/v', name: 'v', html: VALID_HTML })).toBeUndefined();
  });

  it('converts boolean permissions into the spec presence markers', () => {
    const meta = buildUiResourceMeta({
      uri: 'ui://t/v',
      name: 'v',
      html: VALID_HTML,
      permissions: { clipboardWrite: true, camera: false },
    });
    expect(meta).toEqual({ ui: { permissions: { clipboardWrite: {} } } });
  });

  it('passes CSP domains through and includes rendering preferences', () => {
    const meta = buildUiResourceMeta({
      uri: 'ui://t/v',
      name: 'v',
      html: VALID_HTML,
      csp: { connectDomains: ['https://api.transcend.io'] },
      domain: 'views.transcend.io',
      prefersBorder: false,
    });
    expect(meta).toEqual({
      ui: {
        csp: { connectDomains: ['https://api.transcend.io'] },
        domain: 'views.transcend.io',
        prefersBorder: false,
      },
    });
  });

  it('omits an empty csp object rather than emitting a useless key', () => {
    const meta = buildUiResourceMeta({
      uri: 'ui://t/v',
      name: 'v',
      html: VALID_HTML,
      csp: {},
      prefersBorder: true,
    });
    expect(meta).toEqual({ ui: { prefersBorder: true } });
  });
});
