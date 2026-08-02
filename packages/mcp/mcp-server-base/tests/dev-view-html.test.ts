import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DEV_VIEWS_ENV_VAR, devViewsEnabled, viewHtml } from '../src/tools/dev-view-html.js';

const BUNDLED = '<!doctype html><html><body>bundled</body></html>';
const ON_DISK = '<!doctype html><html><body>from disk</body></html>';

/** Name of the view under test, which is all `viewHtml` is told about it. */
const VIEW = 'hello';

/**
 * Stands in for a package that ships a view: a `package.json` at the root, the
 * built document where a view build would leave it, and a nested directory the
 * "module" pretends to run from so the package-root walk has something to climb.
 */
function createFakePackage(): { root: string; moduleUrl: string; builtPath: string } {
  const root = mkdtempSync(join(tmpdir(), 'mcp-dev-view-'));
  // Where `viewHtml` derives the document's location from the view's name, which
  // this has to agree with by hand — that agreement is what these tests check.
  const builtPath = join('src', 'ui', 'generated', `${VIEW}.html`);

  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'fake-pkg' }));
  mkdirSync(join(root, 'src', 'ui', 'generated'), { recursive: true });
  writeFileSync(join(root, builtPath), ON_DISK);
  mkdirSync(join(root, 'dist'), { recursive: true });

  return { root, moduleUrl: pathToFileURL(join(root, 'dist', 'index.mjs')).href, builtPath };
}

describe('devViewsEnabled', () => {
  const original = process.env[DEV_VIEWS_ENV_VAR];

  afterEach(() => {
    if (original === undefined) delete process.env[DEV_VIEWS_ENV_VAR];
    else process.env[DEV_VIEWS_ENV_VAR] = original;
  });

  it('is off when the variable is unset', () => {
    delete process.env[DEV_VIEWS_ENV_VAR];
    expect(devViewsEnabled()).toBe(false);
  });

  it('treats the usual falsy spellings as off, so an exported empty var does not surprise anyone', () => {
    for (const value of ['', '0', 'false', 'FALSE', '  ']) {
      process.env[DEV_VIEWS_ENV_VAR] = value;
      expect(devViewsEnabled()).toBe(false);
    }
  });

  it('is on for any other value', () => {
    for (const value of ['1', 'true', 'yes']) {
      process.env[DEV_VIEWS_ENV_VAR] = value;
      expect(devViewsEnabled()).toBe(true);
    }
  });
});

describe('viewHtml', () => {
  let pkg: ReturnType<typeof createFakePackage>;
  const original = process.env[DEV_VIEWS_ENV_VAR];

  beforeEach(() => {
    pkg = createFakePackage();
  });

  afterEach(() => {
    rmSync(pkg.root, { recursive: true, force: true });
    if (original === undefined) delete process.env[DEV_VIEWS_ENV_VAR];
    else process.env[DEV_VIEWS_ENV_VAR] = original;
  });

  it('returns the inlined string when dev views are off, so production is unchanged', () => {
    delete process.env[DEV_VIEWS_ENV_VAR];
    const html = viewHtml({ bundled: BUNDLED, moduleUrl: pkg.moduleUrl, view: VIEW });
    expect(html).toBe(BUNDLED);
  });

  it('reads the built document from the package root when dev views are on', async () => {
    process.env[DEV_VIEWS_ENV_VAR] = '1';
    const html = viewHtml({ bundled: BUNDLED, moduleUrl: pkg.moduleUrl, view: VIEW });

    expect(typeof html).toBe('function');
    await expect((html as () => Promise<string>)()).resolves.toBe(ON_DISK);
  });

  it('re-reads on every call, which is what makes a rebuild visible without a restart', async () => {
    process.env[DEV_VIEWS_ENV_VAR] = '1';
    const html = viewHtml({
      bundled: BUNDLED,
      moduleUrl: pkg.moduleUrl,
      view: VIEW,
    }) as () => Promise<string>;

    await expect(html()).resolves.toBe(ON_DISK);

    const rebuilt = '<!doctype html><html><body>rebuilt</body></html>';
    writeFileSync(join(pkg.root, pkg.builtPath), rebuilt);
    await expect(html()).resolves.toBe(rebuilt);
  });

  it('explains what to run when the built document is missing', async () => {
    process.env[DEV_VIEWS_ENV_VAR] = '1';
    rmSync(join(pkg.root, pkg.builtPath));
    const html = viewHtml({
      bundled: BUNDLED,
      moduleUrl: pkg.moduleUrl,
      view: VIEW,
    }) as () => Promise<string>;

    await expect(html()).rejects.toThrow(/could not be read/);
  });

  it('rejects a document that is not complete, which a half-written build would produce', async () => {
    process.env[DEV_VIEWS_ENV_VAR] = '1';
    writeFileSync(join(pkg.root, pkg.builtPath), '<div>partial</div>');
    const html = viewHtml({
      bundled: BUNDLED,
      moduleUrl: pkg.moduleUrl,
      view: VIEW,
    }) as () => Promise<string>;

    await expect(html()).rejects.toThrow(/complete HTML5 document/);
  });
});
