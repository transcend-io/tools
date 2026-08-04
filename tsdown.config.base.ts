import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { TsdownPlugin, UserConfig } from 'tsdown';

const repoRoot = path.dirname(fileURLToPath(import.meta.url));

/**
 * Extensions imported for their text rather than parsed as code.
 *
 * `.svg` and `.html` cover assets and prebuilt MCP App views; `.md` covers
 * agent-facing guides served by tools. Exported because `vitest.config.ts` has
 * to load the same set the same way — a build that inlines an extension the
 * test runner does not know about fails only once something imports it.
 */
export const TEXT_ASSET_EXTENSIONS = ['.svg', '.html', '.md'] as const;

/** Source extensions whose text is inlined verbatim and so is useless in a sourcemap. */
const OPAQUE_SOURCE_EXTENSIONS = ['.html', '.svg'];

/**
 * Drops the embedded text of inlined assets from emitted sourcemaps.
 *
 * A prebuilt MCP App view is a single self-contained document — bundled,
 * minified, and hundreds of kilobytes — that the `.html` loader turns into one
 * string literal. Sourcemaps embed every input's text in `sourcesContent`, so
 * each view ends up shipped twice: once in the chunk and once again in the map.
 * For `mcp-server-examples` that is 554 KB of a 572 KB map, and it maps into a
 * string literal, so a debugger gains nothing from it.
 *
 * Only these entries are blanked, rather than setting `sourcemapExcludeSources`,
 * because the TypeScript sources are worth keeping: packages publish `dist` only,
 * so `sourcesContent` is the only way a stack trace from an installed copy can
 * show a code frame.
 */
function stripInlinedAssetSources(): TsdownPlugin {
  return {
    name: 'transcend:strip-inlined-asset-sourcemap-content',
    // Rewrites the emitted `.map` asset rather than the `map` on its chunk:
    // rolldown has already serialized the map into the asset by the time this
    // hook runs, so mutating `chunk.map` changes nothing on disk.
    generateBundle(_options, bundle) {
      for (const [fileName, output] of Object.entries(bundle)) {
        if (!fileName.endsWith('.map') || output.type !== 'asset') continue;

        const raw =
          typeof output.source === 'string'
            ? output.source
            : new TextDecoder().decode(output.source);
        const map = JSON.parse(raw) as {
          /** Input paths the map refers to */
          sources: (string | null)[];
          /** Verbatim text of each input, positionally matched to `sources` */
          sourcesContent?: (string | null)[];
        };
        if (!map.sourcesContent) continue;

        let stripped = false;
        map.sourcesContent = map.sourcesContent.map((content, index) => {
          const source = map.sources[index];
          if (!OPAQUE_SOURCE_EXTENSIONS.some((extension) => source?.endsWith(extension))) {
            return content;
          }
          stripped = true;
          return null;
        });

        if (stripped) output.source = JSON.stringify(map);
      }
    },
  };
}

const sharedLibraryConfig: UserConfig = {
  clean: true,
  dts: true,
  format: ['esm'],
  sourcemap: true,
  loader: Object.fromEntries(
    TEXT_ASSET_EXTENSIONS.map((extension) => [extension, 'text']),
  ) as UserConfig['loader'],
  alias: {
    '@tools/assets': path.join(repoRoot, 'assets'),
  },
  plugins: [stripInlinedAssetSources()],
};

export default sharedLibraryConfig;
