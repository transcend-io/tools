import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import type { Plugin, UserConfig } from 'vite';

const repoRoot = path.dirname(fileURLToPath(import.meta.url));

/**
 * Element id the emitted document exposes for React to mount into.
 *
 * Exported so a view's entry module and this template cannot drift apart.
 */
export const MCP_APP_ROOT_ID = 'root';

/** Directory under a package that holds its views, one per subdirectory. */
const VIEWS_DIR = path.join('src', 'ui');

/**
 * Directory the built documents are written to, relative to the package.
 *
 * Inside `src/` rather than `dist/` because tsdown cleans `dist/` and then
 * inlines these documents as strings. Gitignored.
 */
export const MCP_APP_OUT_DIR = path.join('src', 'ui', 'generated');

/**
 * Names {@link synthesizeMcpAppViews} serves from inside each view directory.
 *
 * No file exists at either path. They are absolute paths rather than
 * `virtual:` ids because both need to behave like real files: Vite's
 * `build.lib.entry` takes a path, and Tailwind derives its class-scanning root
 * from `path.dirname` of the stylesheet's id — so an id outside the view
 * directory would scan the wrong tree.
 */
const SYNTHESIZED_ENTRY = 'mcp-app-entry.tsx';
const SYNTHESIZED_STYLESHEET = 'mcp-app-theme.css';

/** A view found under a package's `src/ui`. */
export interface McpAppView {
  /** Directory name under `src/ui`, which is also the view's id, e.g. `hello` */
  name: string;
  /** Absolute path to the view's directory */
  directory: string;
  /** Absolute path to the component module, e.g. `.../hello/HelloView.tsx` */
  componentPath: string;
  /** Component's exported name, which matches its filename, e.g. `HelloView` */
  componentName: string;
  /** Absolute path the synthesized entry module is served from */
  entryId: string;
  /** Absolute path the synthesized stylesheet is served from */
  cssId: string;
  /** Absolute path to the view's own optional stylesheet, when it has one */
  stylesheet?: string;
  /**
   * Absolute paths to `_`-prefixed directories under `src/ui`, which hold
   * components shared between views.
   *
   * Carried per view because Tailwind generates utilities per document: a shared
   * component's classes have to be scanned for every view that might render it,
   * and a view cannot know which those are.
   */
  sharedDirectories: string[];
  /** Emitted document's name, e.g. `hello.html` */
  fileName: string;
}

/**
 * Finds a package's views by convention: one directory per view under `src/ui`,
 * each holding exactly one `*View.tsx`.
 *
 * The component's filename determines the export the synthesized entry imports,
 * so `HelloView.tsx` must export `HelloView`. A directory holding files but no
 * `*View.tsx`, or several, is an error rather than a skip: silently ignoring it
 * is how a renamed component turns into a view that simply stops existing, with
 * a passing build. Prefix a directory with `_` to hold shared code that is not a
 * view.
 *
 * @param packageDir - Absolute path to the package
 * @returns Views in a stable order
 */
export function discoverMcpAppViews(packageDir: string): McpAppView[] {
  const viewsDir = path.join(packageDir, VIEWS_DIR);
  if (!existsSync(viewsDir)) return [];

  const views: McpAppView[] = [];
  const directories = readdirSync(viewsDir, { withFileTypes: true }).filter((entry) =>
    entry.isDirectory(),
  );
  const sharedDirectories = directories
    .filter((entry) => entry.name.startsWith('_'))
    .map((entry) => path.join(viewsDir, entry.name));

  for (const entry of directories) {
    // The output directory holds the built documents, not source, and `_` marks
    // shared code rather than a view.
    if (entry.name === path.basename(MCP_APP_OUT_DIR) || entry.name.startsWith('_')) continue;

    const directory = path.join(viewsDir, entry.name);
    const files = readdirSync(directory);

    // An entirely empty directory can only be what a deleted view left behind:
    // git cannot track one and no build step creates one. Erroring on it would
    // mean deleting a view and scaffolding it again fails on the leftover folder.
    if (files.length === 0) continue;

    const components = files.filter((file) => file.endsWith('View.tsx')).sort();

    if (components.length !== 1) {
      throw new Error(
        `MCP App view directory "${path.relative(packageDir, directory)}" holds ${components.length} files matching *View.tsx${components.length > 0 ? ` (${components.join(', ')})` : ''}, but a view is defined by exactly one. ` +
          'Rename the component so a single file matches, or prefix the directory with "_" if it is shared code rather than a view.',
      );
    }

    const componentFile = components[0]!;
    const stylesheet = path.join(directory, `${entry.name}.css`);

    views.push({
      name: entry.name,
      directory,
      componentPath: path.join(directory, componentFile),
      componentName: path.basename(componentFile, '.tsx'),
      entryId: path.join(directory, SYNTHESIZED_ENTRY),
      cssId: path.join(directory, SYNTHESIZED_STYLESHEET),
      ...(existsSync(stylesheet) && { stylesheet }),
      sharedDirectories,
      fileName: `${entry.name}.html`,
    });
  }

  return views.sort((a, b) => a.name.localeCompare(b.name));
}

/** Source of the entry module that mounts one view. */
function synthesizedEntry(view: McpAppView): string {
  // A view's own stylesheet comes last, though the order is not what gives it
  // precedence: it is unlayered, and unlayered rules outrank every layer the
  // theme declares.
  const ownStylesheet =
    view.stylesheet === undefined ? '' : `import './${path.basename(view.stylesheet)}';\n`;

  return `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ${view.componentName} } from './${path.basename(view.componentPath)}';

import './${SYNTHESIZED_STYLESHEET}';
${ownStylesheet}
const container = document.getElementById(${JSON.stringify(MCP_APP_ROOT_ID)});
if (!container) {
  throw new Error(
    'MCP App view "${view.name}" could not start: the document has no #${MCP_APP_ROOT_ID} container',
  );
}

createRoot(container).render(
  <StrictMode>
    <${view.componentName} />
  </StrictMode>,
);
`;
}

/**
 * Extensions a `@source` glob claims.
 *
 * `.ts` as well as `.tsx` because class names do not only appear in JSX: a
 * status-to-color lookup or a variant map is an ordinary module, and a view that
 * imports one bundles it correctly and then renders it unstyled.
 */
const SOURCE_EXTENSIONS = '{ts,tsx}';

/** Source of the stylesheet that gives one view its utilities. */
function synthesizedStylesheet(view: McpAppView): string {
  // `source(none)` in the theme means utilities are only generated for files a
  // stylesheet explicitly claims. This one claims the view's own directory, which
  // is why the id has to sit inside it, plus any shared directories — a component
  // under `_shared` would otherwise be bundled and render unstyled.
  const sources = [
    `./**/*.${SOURCE_EXTENSIONS}`,
    ...view.sharedDirectories.map((directory) => globFrom(view.directory, directory)),
  ];

  return [
    `@import '@transcend-io/mcp-server-base/ui/theme.css';`,
    '',
    ...sources.map((source) => `@source '${source}';`),
    '',
  ].join('\n');
}

/** A `@source` glob for `directory`, written relative to `from` in posix form. */
function globFrom(from: string, directory: string): string {
  const relative = path.relative(from, directory).split(path.sep).join('/');
  return `${relative}/**/*.${SOURCE_EXTENSIONS}`;
}

/** Splits Vite's `?direct`-style suffix off an id. */
function splitQuery(id: string): [specifier: string, suffix: string] {
  const match = /[?#]/.exec(id);
  return match === null ? [id, ''] : [id.slice(0, match.index), id.slice(match.index)];
}

/**
 * Serves each view's entry module and stylesheet without either existing on disk.
 *
 * Both files are pure boilerplate — they differ between views only by the
 * component's name — so writing them per view is repetition that drifts. The
 * cost is that a view directory no longer shows how it boots, which the MCP
 * README carries instead.
 *
 * @param views - Views whose modules this plugin should serve
 * @returns A Vite plugin
 */
export function synthesizeMcpAppViews(views: readonly McpAppView[]): Plugin {
  const sources = new Map<string, () => string>();
  for (const view of views) {
    sources.set(view.entryId, () => synthesizedEntry(view));
    sources.set(view.cssId, () => synthesizedStylesheet(view));
  }

  return {
    name: 'transcend:mcp-app-synthesized-views',
    // Ahead of Tailwind, which must see the stylesheet's contents to compile it.
    enforce: 'pre',
    resolveId(source, importer) {
      const [specifier, suffix] = splitQuery(source);

      // Requested directly, as `build.lib.entry`.
      if (sources.has(specifier)) return source;

      // The entry imports its stylesheet as a sibling. Vite's own resolver would
      // look for the file and fail, and in dev it arrives with a `?direct` or
      // `?used` suffix that has to survive.
      if (importer !== undefined && specifier.startsWith('.')) {
        const [importerPath] = splitQuery(importer);
        if (sources.has(importerPath)) {
          const resolved = path.resolve(path.dirname(importerPath), specifier);
          if (sources.has(resolved)) return resolved + suffix;
        }
      }

      return undefined;
    },
    load(id) {
      return sources.get(splitQuery(id)[0])?.();
    },
  };
}

/**
 * Module resolution for the view build.
 *
 * Separate from {@link defineMcpAppView} because resolution is the half a second
 * consumer would need — workspace packages resolved to TypeScript source, plus
 * the shared asset alias — without inheriting the settings that collapse a build
 * into one inlined document.
 */
export function mcpAppResolve(): NonNullable<UserConfig['resolve']> {
  return {
    alias: {
      '@tools/assets': path.join(repoRoot, 'assets'),
      // Stylesheets a view imports from a workspace package are aliased rather
      // than left to `conditions` below, because Tailwind resolves `@import`
      // with its own resolver: it inherits this `alias` map but replaces
      // `conditions` with `['style', ...]`, so `@transcend-io/source` never
      // applies and a bare specifier would resolve to `dist/`. That would put
      // those packages' builds on the view build graph and, worse, `dist/` is
      // briefly empty while they rebuild.
      '@transcend-io/mcp-server-base/ui/theme.css': path.join(
        repoRoot,
        'packages/mcp/mcp-server-base/src/ui/theme.css',
      ),
      '@transcend-io/design-tokens/tokens.css': path.join(
        repoRoot,
        'packages/design-tokens/src/tokens.css',
      ),
    },
    // Resolve workspace packages to their TypeScript source, as tsdown and
    // Vitest do. A view can then be built without its dependencies being built
    // first, which keeps this step off the package build graph.
    // The remaining entries restate Vite's defaults, which this key replaces.
    conditions: ['@transcend-io/source', 'module', 'browser', 'development|production'],
  };
}

/** Options for {@link defineMcpAppView}. */
export interface McpAppViewOptions {
  /** The view to build, as returned by {@link discoverMcpAppViews} */
  view: McpAppView;
  /** Text of the document's `<title>`; hosts do not surface it */
  title?: string;
}

/**
 * Escapes sequences that would let bundled JavaScript break out of the
 * `<script>` element it is inlined into.
 *
 * An HTML parser ends a script at the first `</script`, even inside a string
 * literal, so a view that merely *mentions* that text would otherwise emit a
 * broken document. `<\/script` is an equivalent escape everywhere it can legally
 * appear in JavaScript.
 */
function escapeForInlineScript(code: string): string {
  return code.replace(/<\/(script)/gi, String.raw`<\/$1`).replace(/<!--/g, String.raw`<\!--`);
}

/**
 * Escapes the one sequence that would let compiled CSS break out of the
 * `<style>` element it is inlined into.
 *
 * The same hazard as {@link escapeForInlineScript} and not a hypothetical one:
 * `content-['</style>']` is a legal Tailwind arbitrary value, and a view's own
 * stylesheet may write that string directly. `\/` is a valid CSS escape for `/`,
 * and `</style` cannot appear outside a string in valid CSS, so escaping every
 * occurrence is safe.
 */
function escapeForInlineStyle(css: string): string {
  return css.replace(/<\/(style)/gi, String.raw`<\/$1`);
}

/** Escapes text interpolated into HTML character data. */
function escapeHtmlText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function decodeSource(source: string | Uint8Array): string {
  return typeof source === 'string' ? source : new TextDecoder().decode(source);
}

/**
 * Collapses a view's JavaScript and CSS into one self-contained HTML document.
 *
 * MCP Apps are delivered as a single string over `resources/read` and rendered in
 * a sandboxed iframe that has no same-origin server, so nothing may be left
 * behind as a separate file to fetch. Inlining also means the resource needs no
 * CSP `resourceDomains` entry at all, and the host's default
 * `script-src 'self' 'unsafe-inline'` is enough to run it.
 *
 * Exported so the document's shape and its escaping can be asserted from a fake
 * bundle. Building a real view to test them would need a package with React
 * installed, which is the one thing this layer deliberately does not have.
 *
 * @param options - Name to emit the document under and its `<title>`
 * @returns A Vite plugin
 */
export function inlineIntoSingleHtml({
  fileName,
  title,
}: {
  /** Name the emitted document is written under, e.g. `hello.html` */
  fileName: string;
  /** Text of the document's `<title>` */
  title: string;
}): Plugin {
  return {
    name: 'transcend:mcp-app-single-file',
    enforce: 'post',
    generateBundle(_outputOptions, bundle) {
      const scripts: string[] = [];
      const styles: string[] = [];
      const external: string[] = [];

      for (const [name, output] of Object.entries(bundle)) {
        if (output.type === 'chunk') {
          scripts.push(output.code);
        } else if (name.endsWith('.css')) {
          styles.push(decodeSource(output.source));
        } else {
          external.push(name);
          continue;
        }
        delete bundle[name];
      }

      if (external.length > 0) {
        throw new Error(
          `MCP App view "${fileName}" emitted ${external.length} asset(s) that would have to be fetched over the network: ${external.join(', ')}. ` +
            'Views render in a sandboxed iframe with no same-origin server, so every byte must be inlined. ' +
            'Import the asset so it becomes a data URI, or remove the dependency.',
        );
      }

      const styleTags = styles
        .map((css) => `    <style>\n${escapeForInlineStyle(css)}\n    </style>`)
        .join('\n');
      const scriptTags = scripts
        .map((code) => `    <script>\n${escapeForInlineScript(code)}\n    </script>`)
        .join('\n');

      this.emitFile({
        type: 'asset',
        fileName,
        source: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtmlText(title)}</title>
${styleTags}
  </head>
  <body>
    <div id="${MCP_APP_ROOT_ID}"></div>
${scriptTags}
  </body>
</html>
`,
      });
    },
  };
}

/**
 * Builds the Vite config for one MCP App view.
 *
 * The output is a single HTML document with all JavaScript and CSS inlined,
 * ready to be handed to `defineUiResource`. React and JSX need no plugin here:
 * Vite transforms `.tsx` natively using the `jsx` setting from the view's
 * tsconfig, which avoids `@vitejs/plugin-react` and its Babel peers. Tailwind
 * does need its plugin.
 *
 * One config builds one view, because `inlineIntoSingleHtml` collapses the whole
 * bundle into one document. A package with several views therefore needs several
 * builds, which is what `scripts/build-mcp-views.ts` does.
 *
 * @param options - The view to build and the document's title
 * @returns A Vite config for that one view
 */
export function defineMcpAppView({
  view,
  title = 'Transcend MCP App',
}: McpAppViewOptions): UserConfig {
  return {
    // A view is a standalone document, never hosted at a URL path.
    base: './',
    // Vite's library mode deliberately leaves `process.env.NODE_ENV` in place for
    // downstream bundlers to substitute. A view has no downstream bundler and no
    // `process` in a sandboxed iframe, so leaving it would throw a ReferenceError
    // on first render — and keep React's development build, which is several
    // times larger.
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
    resolve: mcpAppResolve(),
    // A package's `public/` would be copied to the output directory verbatim,
    // and copied files never enter the bundle — so `inlineIntoSingleHtml` would
    // not see them and could not report that they cannot be fetched. Disabling
    // the directory is what keeps that check exhaustive.
    publicDir: false,
    build: {
      outDir: MCP_APP_OUT_DIR,
      // Every view in a package writes here, so emptying it would leave only the
      // view that happened to build last. The build script clears it once up
      // front instead.
      emptyOutDir: false,
      // Views run in the host's embedded browser (Chromium in the desktop apps),
      // so there is no legacy engine to downlevel for. Matches the `target` the
      // Node packages compile to.
      target: 'es2022',
      // A single IIFE means the document needs no module loader, no dynamic
      // import, and no `type="module"` script, which is the most portable thing
      // to run from an opaque-origin iframe.
      lib: {
        entry: view.entryId,
        formats: ['iife'],
        name: 'TranscendMcpAppView',
        fileName: () => 'view.js',
      },
      cssCodeSplit: false,
      // Inline every asset regardless of size; a file left on disk could not be
      // fetched by the iframe.
      assetsInlineLimit: Number.MAX_SAFE_INTEGER,
      // The script is inlined, so a sourcemap comment would point at a file that
      // is not shipped.
      sourcemap: false,
      reportCompressedSize: false,
    },
    plugins: [
      synthesizeMcpAppViews([view]),
      tailwindcss(),
      inlineIntoSingleHtml({ fileName: view.fileName, title }),
    ],
  };
}
