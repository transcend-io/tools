#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Bundles the Hello World MCP App UI into a single HTML file under `dist/apps/`.
 *
 * Run after `tsdown` (tsdown cleans `dist/`).
 */
import * as esbuild from 'esbuild';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const entry = join(root, 'src/apps/hello-world/main.ts');
const outFile = join(root, 'dist/apps/hello-world.html');

const result = await esbuild.build({
  entryPoints: [entry],
  bundle: true,
  write: false,
  format: 'iife',
  platform: 'browser',
  target: ['es2022'],
  logLevel: 'info',
});

const js = result.outputFiles?.[0]?.text;
if (!js) {
  throw new Error('esbuild produced no output for hello-world app');
}

const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Hello World</title>
    <style>
      :root {
        color-scheme: light dark;
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif;
      }
      body {
        margin: 0;
        padding: 1.25rem;
        background: Canvas;
        color: CanvasText;
      }
      main {
        max-width: 28rem;
      }
      h1 {
        font-size: 1.25rem;
        margin: 0 0 0.75rem;
      }
      p {
        margin: 0 0 1rem;
        line-height: 1.4;
      }
      button {
        appearance: none;
        border: 1px solid color-mix(in srgb, CanvasText 25%, transparent);
        background: color-mix(in srgb, CanvasText 6%, Canvas);
        color: inherit;
        border-radius: 0.5rem;
        padding: 0.5rem 0.85rem;
        font: inherit;
        cursor: pointer;
      }
      button:hover {
        background: color-mix(in srgb, CanvasText 12%, Canvas);
      }
      #greeting {
        font-weight: 600;
      }
      .meta {
        font-size: 0.85rem;
        opacity: 0.75;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Assessments MCP App</h1>
      <p>Greeting: <span id="greeting">Loading…</span></p>
      <p class="meta">Display mode: <code id="display-mode">…</code></p>
      <div class="actions">
        <button type="button" id="refresh">Say hello again</button>
        <button type="button" id="keep-open">Keep open</button>
      </div>
    </main>
    <script>${js}</script>
  </body>
</html>
`;

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, html, 'utf8');
console.log(`Wrote ${outFile}`);
