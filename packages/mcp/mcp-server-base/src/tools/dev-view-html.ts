import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertHtmlDocument } from './ui-resource.js';

/**
 * Environment variable that makes views read their built HTML from disk on every
 * `resources/read` instead of using the copy inlined at build time.
 *
 * Set by `pnpm mcp:inspect`. A view rebuild is then picked up
 * by re-reading the resource, with no server restart and no host reconnect,
 * which is the difference between a two-second loop and a twenty-second one.
 */
export const DEV_VIEWS_ENV_VAR = 'TRANSCEND_MCP_DEV_VIEWS';

/** Whether views should be read from disk per request. */
export function devViewsEnabled(): boolean {
  const value = process.env[DEV_VIEWS_ENV_VAR];
  if (value === undefined) return false;
  const normalized = value.trim().toLowerCase();
  return normalized !== '' && normalized !== '0' && normalized !== 'false';
}

/**
 * Locates the package a module belongs to by walking up to the nearest
 * `package.json`.
 *
 * A view's built HTML lives at a path relative to its package root, but the
 * module asking for it runs from `src` under Vitest and from `dist` once built,
 * so neither location can anchor the lookup on its own. tsdown emits no
 * `package.json` into `dist`, so the first one found is always the real root.
 */
function findPackageRoot(moduleUrl: string): string {
  let directory = dirname(fileURLToPath(moduleUrl));
  for (;;) {
    if (existsSync(join(directory, 'package.json'))) return directory;
    const parent = dirname(directory);
    if (parent === directory) {
      throw new Error(
        `Could not find a package.json above "${moduleUrl}" while resolving a dev view path.`,
      );
    }
    directory = parent;
  }
}

/** Where a package's view build writes its documents, relative to its root. */
const BUILT_VIEWS_DIR = join('src', 'ui', 'generated');

/** Options for {@link viewHtml}. */
export interface ViewHtmlOptions {
  /** The document inlined at build time, used unless dev views are enabled */
  bundled: string;
  /** `import.meta.url` of the calling module, used to find its package root */
  moduleUrl: string;
  /** View's name, i.e. its directory under `src/ui`, e.g. `hello` */
  view: string;
}

/**
 * Chooses how a view's HTML reaches the host.
 *
 * Returns the inlined string normally, so production behaves exactly as if this
 * indirection did not exist and `defineUiResource` still validates the document
 * at construction. Under {@link DEV_VIEWS_ENV_VAR} it returns a factory that
 * re-reads the built file on each request instead.
 *
 * @param options - The bundled document plus which view it belongs to
 * @returns A value suitable for `UiResourceDefinition.html`
 *
 * @example
 * ```ts
 * html: viewHtml({
 *   bundled: HELLO_APP_HTML,
 *   moduleUrl: import.meta.url,
 *   view: 'hello',
 * }),
 * ```
 */
export function viewHtml({
  bundled,
  moduleUrl,
  view,
}: ViewHtmlOptions): string | (() => Promise<string>) {
  if (!devViewsEnabled()) return bundled;

  const builtPath = join(BUILT_VIEWS_DIR, `${view}.html`);
  const absolutePath = join(findPackageRoot(moduleUrl), builtPath);

  return async () => {
    let html: string;
    try {
      html = await readFile(absolutePath, 'utf8');
    } catch (error) {
      throw new Error(
        `${DEV_VIEWS_ENV_VAR} is set, but the built view at "${absolutePath}" could not be read: ` +
          `${error instanceof Error ? error.message : String(error)}. ` +
          'Run the view build for this package, or unset the variable to serve the inlined copy.',
      );
    }
    // The build normally runs before the document is validated; reading from
    // disk skips that, so a half-written file would otherwise reach the host as
    // a blank iframe.
    assertHtmlDocument(builtPath, html);
    return html;
  };
}
