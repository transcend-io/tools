import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import {
  defineMcpAppView,
  discoverMcpAppViews,
  inlineIntoSingleHtml,
  MCP_APP_OUT_DIR,
  MCP_APP_UI_SRC_DIR,
  synthesizeMcpAppViews,
  type McpAppView,
} from '../vite.config.base.ts';

/**
 * Covers the view build pipeline without building a view.
 *
 * The pipeline's own end-to-end proof needs a package with React installed,
 * which is exactly what this layer does not have — the first real view arrives
 * with the examples package. Everything below is reachable anyway: discovery
 * reads a directory, the synthesized modules are strings, and the single-file
 * plugin only rearranges a bundle object.
 */

const temporaryRoots: string[] = [];

afterEach(() => {
  while (temporaryRoots.length > 0) {
    rmSync(temporaryRoots.pop()!, { recursive: true, force: true });
  }
});

/**
 * Writes a throwaway package whose `src/ui` holds the given files.
 *
 * @param files - Paths under `src/ui`, in posix form, each written empty
 * @returns Absolute path to the package
 */
function fakePackage(files: string[]): string {
  const root = mkdtempSync(path.join(tmpdir(), 'mcp-app-build-'));
  temporaryRoots.push(root);

  for (const file of files) {
    const absolute = path.join(root, 'src', 'ui', ...file.split('/'));
    mkdirSync(path.dirname(absolute), { recursive: true });
    writeFileSync(absolute, '');
  }
  return root;
}

/** Calls a plugin's `resolveId` hook, which is a plain function here. */
function resolveId(plugin: ReturnType<typeof synthesizeMcpAppViews>) {
  return plugin.resolveId as unknown as (
    source: string,
    importer?: string,
  ) => string | null | undefined;
}

/** Calls a plugin's `load` hook, which is a plain function here. */
function load(plugin: ReturnType<typeof synthesizeMcpAppViews>) {
  return plugin.load as unknown as (id: string) => string | undefined;
}

/** One file the single-file plugin is handed, in the shape Rollup uses. */
interface FakeBundleEntry {
  /** Whether Rollup would treat this as compiled code or a copied file */
  type: 'chunk' | 'asset';
  /** Generated JavaScript, for a chunk */
  code?: string;
  /** File contents, for an asset */
  source?: string;
}

/**
 * Runs the single-file plugin over a fake bundle.
 *
 * @param bundle - Output names mapped to what Rollup would have generated
 * @param title - Text the document's `<title>` should carry
 * @returns The emitted document and the bundle the plugin left behind
 */
function inline(
  bundle: Record<string, FakeBundleEntry>,
  title = 'Transcend MCP App',
): { html: string; remaining: string[] } {
  const plugin = inlineIntoSingleHtml({ fileName: 'hello.html', title });
  const emitted: { fileName: string; source: string }[] = [];

  const generateBundle = plugin.generateBundle as unknown as (
    this: {
      emitFile: (file: { type: 'asset'; fileName: string; source: string }) => void;
    },
    outputOptions: unknown,
    bundle: Record<string, FakeBundleEntry>,
  ) => void;

  generateBundle.call(
    {
      emitFile: (file) => {
        emitted.push({ fileName: file.fileName, source: file.source });
      },
    },
    {},
    bundle,
  );

  return { html: emitted[0]?.source ?? '', remaining: Object.keys(bundle) };
}

describe('discoverMcpAppViews', () => {
  test('a package with no src/ui has no views rather than failing', () => {
    expect(discoverMcpAppViews(fakePackage([]))).toEqual([]);
  });

  test('a view is a directory holding exactly one *View.tsx', () => {
    const root = fakePackage(['hello/HelloView.tsx', 'hello/Badge.tsx']);
    const [view] = discoverMcpAppViews(root);

    expect(view?.name).toBe('hello');
    expect(view?.componentPath).toBe(path.join(root, 'src', 'ui', 'hello', 'HelloView.tsx'));
    // The synthesized entry imports this name, so it is the filename's promise.
    expect(view?.componentName).toBe('HelloView');
    expect(view?.fileName).toBe('hello.html');
  });

  test('views come back in a stable order regardless of how the disk lists them', () => {
    const root = fakePackage(['zulu/ZuluView.tsx', 'alpha/AlphaView.tsx', 'mike/MikeView.tsx']);

    expect(discoverMcpAppViews(root).map((view) => view.name)).toEqual(['alpha', 'mike', 'zulu']);
  });

  test('a directory holding files but not exactly one *View.tsx is rejected', () => {
    // Skipping it silently is how renaming a component turns into a view that
    // stops existing, with a passing build.
    expect(() => discoverMcpAppViews(fakePackage(['broken/helpers.ts']))).toThrow(
      '0 files matching *View.tsx',
    );
    expect(() =>
      discoverMcpAppViews(fakePackage(['broken/HelloView.tsx', 'broken/DetailView.tsx'])),
    ).toThrow('2 files matching *View.tsx');
  });

  test('nesting is not searched, so a nested *View.tsx is not a second entry', () => {
    const root = fakePackage(['hello/HelloView.tsx', 'hello/table/TriageTableView.tsx']);

    expect(discoverMcpAppViews(root).map((view) => view.componentName)).toEqual(['HelloView']);
  });

  test('an underscore-prefixed directory is shared code, carried by every view', () => {
    const root = fakePackage([
      '_shared/Badge.tsx',
      'hello/HelloView.tsx',
      'goodbye/GoodbyeView.tsx',
    ]);

    // Every view has to carry it, because Tailwind generates utilities per
    // document and a view cannot know which shared components it will render.
    for (const view of discoverMcpAppViews(root)) {
      expect(view.sharedDirectories).toEqual([path.join(root, 'src', 'ui', '_shared')]);
    }
  });

  test('the output directory is not mistaken for a malformed view', () => {
    const root = fakePackage([
      'hello/HelloView.tsx',
      `${path.basename(MCP_APP_OUT_DIR)}/hello.html`,
    ]);

    expect(discoverMcpAppViews(root).map((view) => view.name)).toEqual(['hello']);
  });

  test("a view's own stylesheet is optional and found by name", () => {
    expect(
      discoverMcpAppViews(fakePackage(['hello/HelloView.tsx']))[0]?.stylesheet,
    ).toBeUndefined();

    const root = fakePackage(['hello/HelloView.tsx', 'hello/hello.css']);
    expect(discoverMcpAppViews(root)[0]?.stylesheet).toBe(
      path.join(root, 'src', 'ui', 'hello', 'hello.css'),
    );
  });
});

describe('synthesizeMcpAppViews', () => {
  /** The single view of a fixture package, with its plugin. */
  function fixture(files: string[]): {
    /** The discovered view */
    view: McpAppView;
    /** The plugin serving that view's entry and stylesheet */
    plugin: ReturnType<typeof synthesizeMcpAppViews>;
  } {
    const view = discoverMcpAppViews(fakePackage(files))[0]!;
    return { view, plugin: synthesizeMcpAppViews([view]) };
  }

  test('the entry mounts the component the filename promises', () => {
    const { view, plugin } = fixture(['hello/HelloView.tsx']);
    const entry = load(plugin)(view.entryId);

    expect(entry).toContain("import { HelloView } from './HelloView.tsx';");
    expect(entry).toContain('<HelloView />');
    expect(entry).toContain('<StrictMode>');
    // The id the emitted document exposes; a mismatch is a blank view.
    expect(entry).toContain('document.getElementById("root")');
  });

  test("the entry imports the view's own stylesheet only when it has one", () => {
    const without = fixture(['hello/HelloView.tsx']);
    expect(load(without.plugin)(without.view.entryId)).not.toContain('hello.css');

    const withCss = fixture(['hello/HelloView.tsx', 'hello/hello.css']);
    expect(load(withCss.plugin)(withCss.view.entryId)).toContain("import './hello.css';");
  });

  test('the stylesheet claims the view and every shared directory', () => {
    const { view, plugin } = fixture([
      'hello/HelloView.tsx',
      '_shared/Badge.tsx',
      '_icons/Icon.tsx',
    ]);
    const css = load(plugin)(view.cssId);

    expect(css).toContain("@import '@transcend-io/mcp-server-base/ui/theme.css';");
    // `.ts` as well as `.tsx`: a variant map is an ordinary module, and one left
    // unscanned bundles correctly and then renders unstyled.
    expect(css).toContain("@source './**/*.{ts,tsx}';");
    expect(css).toContain("@source '../_shared/**/*.{ts,tsx}';");
    expect(css).toContain("@source '../_icons/**/*.{ts,tsx}';");
    // Cross-package presentational components live outside `src/ui/_*`, so the
    // synthesized stylesheet always claims their source tree too.
    const mcpAppUiSource = path
      .relative(view.directory, MCP_APP_UI_SRC_DIR)
      .split(path.sep)
      .join('/');
    expect(css).toContain(`@source '${mcpAppUiSource}/**/*.{ts,tsx}';`);
  });

  test('the entry resolves its stylesheet as a sibling that exists nowhere on disk', () => {
    const { view, plugin } = fixture(['hello/HelloView.tsx']);

    expect(resolveId(plugin)('./mcp-app-theme.css', view.entryId)).toBe(view.cssId);
  });

  test("Vite's query suffixes survive resolution", () => {
    const { view, plugin } = fixture(['hello/HelloView.tsx']);

    // Dev requests the stylesheet as `?direct`; dropping the suffix returns the
    // wrong representation of the module.
    expect(resolveId(plugin)('./mcp-app-theme.css?direct', view.entryId)).toBe(
      `${view.cssId}?direct`,
    );
    expect(load(plugin)(`${view.cssId}?direct`)).toContain('@import');
  });

  test('modules that do exist are left to Vite', () => {
    const { view, plugin } = fixture(['hello/HelloView.tsx', 'hello/hello.css']);

    expect(resolveId(plugin)('./HelloView.tsx', view.entryId)).toBeUndefined();
    expect(resolveId(plugin)('./hello.css', view.entryId)).toBeUndefined();
    expect(resolveId(plugin)('react', view.entryId)).toBeUndefined();
    expect(load(plugin)(path.join(view.directory, 'HelloView.tsx'))).toBeUndefined();
  });
});

describe('inlineIntoSingleHtml', () => {
  test('one document carries the script, the styles, and the mount point', () => {
    const { html, remaining } = inline({
      'view.js': { type: 'chunk', code: 'console.log(1);' },
      'style.css': { type: 'asset', source: '.a{color:red}' },
    });

    expect(html).toContain('<script>\nconsole.log(1);\n');
    expect(html).toContain('<style>\n.a{color:red}\n');
    expect(html).toContain('<div id="root"></div>');
    // Anything left in the bundle is written beside the document, where the
    // iframe could not fetch it.
    expect(remaining).toEqual([]);
  });

  test('a script that merely mentions </script> does not end the element early', () => {
    // Not hypothetical: React DOM's own bundle contains this sequence.
    const { html } = inline({
      'view.js': { type: 'chunk', code: String.raw`const a = "</script>";` },
    });

    expect(html).toContain(String.raw`const a = "<\/script>";`);
    expect(html).not.toContain('"</script>";');
    // Still one script element, so the document survived.
    expect(html.match(/<script>/g)).toHaveLength(1);
  });

  test('a script that mentions <!-- does not open an HTML comment', () => {
    const { html } = inline({ 'view.js': { type: 'chunk', code: 'const a = "<!--";' } });

    expect(html).toContain(String.raw`const a = "<\!--";`);
  });

  test('a stylesheet that mentions </style> does not end the element early', () => {
    // `content-['</style>']` is a legal Tailwind arbitrary value.
    const { html } = inline({
      'style.css': { type: 'asset', source: String.raw`.a::after{content:"</style>"}` },
    });

    expect(html).toContain(String.raw`content:"<\/style>"`);
    expect(html).not.toContain('"</style>"}');
    expect(html.match(/<style>/g)).toHaveLength(1);
  });

  test('the title is escaped rather than interpolated', () => {
    const { html } = inline({ 'view.js': { type: 'chunk', code: '' } }, 'Cookies & <b>more</b>');

    expect(html).toContain('<title>Cookies &amp; &lt;b&gt;more&lt;/b&gt;</title>');
  });

  test('an asset that would have to be fetched fails the build by name', () => {
    expect(() =>
      inline({
        'view.js': { type: 'chunk', code: '' },
        'assets/logo.woff2': { type: 'asset', source: 'binary' },
      }),
    ).toThrow('assets/logo.woff2');
  });
});

describe('defineMcpAppView', () => {
  /** The config for a throwaway one-view package. */
  function config() {
    return defineMcpAppView({
      view: discoverMcpAppViews(fakePackage(['hello/HelloView.tsx']))[0]!,
    });
  }

  test('a public directory cannot smuggle files past the inlining check', () => {
    // Copied files never enter the bundle, so `inlineIntoSingleHtml` would not
    // see them and could not report that the iframe cannot fetch them.
    expect(config().publicDir).toBe(false);
  });

  test('NODE_ENV is substituted rather than left for a bundler that does not exist', () => {
    // A sandboxed iframe has no `process`, so leaving it is a ReferenceError on
    // first render, and React's development build would ship.
    expect(config().define?.['process.env.NODE_ENV']).toBe('"production"');
  });
});
