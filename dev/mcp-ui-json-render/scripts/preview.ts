import { readFileSync, writeFileSync } from 'node:fs';

/**
 * Renders a sample spec to `preview.html` using the compiled view CSS, so
 * styling can be checked in a browser without restarting an MCP host.
 *
 * Run after `build`, which produces the bundle this reads the CSS from:
 * `npx tsx --tsconfig tsconfig.ui.json scripts/preview.ts` — the view tsconfig
 * is what gives the imported components the automatic JSX runtime.
 */
import type { Spec } from '@json-render/core';
import { JSONUIProvider, Renderer } from '@json-render/react';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { logger } from '../../../scripts/logger.ts';
import { PeriodChangeProvider } from '../src/ui/json-render/components/Heading.tsx';
import { registry } from '../src/ui/json-render/registry.tsx';

const bundle = readFileSync(
  new URL('../src/ui/generated/json-render.html', import.meta.url),
  'utf8',
);
const css = [...bundle.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');

const metric = (label: string, value: number, format: string, note: string, tone: string) => ({
  type: 'MetricCard',
  children: [],
  props: { label, value, format, delta: null, deltaTone: null, note: { text: note, tone } },
});

const bar = (label: string, caption: string, live: number, review: number, junk: number) => ({
  type: 'ProgressBar',
  children: [],
  props: {
    label,
    caption,
    segments: [
      { label: 'Live', value: live, tone: 'success' },
      { label: 'Need review', value: review, tone: 'warning' },
      { label: 'Junk', value: junk, tone: 'danger' },
    ],
  },
});

const spec = {
  root: 'root',
  elements: {
    root: {
      type: 'Grid',
      props: { columns: 1, gap: 'md' },
      children: ['eyebrow', 'kpis', 'triage', 'cookies', 'flows'],
    },
    eyebrow: {
      type: 'Heading',
      children: [],
      props: {
        text: 'Consent activity',
        variant: 'eyebrow',
        periods: ['7d', '30d', '90d', '6mo'],
        selectedPeriod: '90d',
      },
    },
    kpis: {
      type: 'Grid',
      props: { columns: 4, gap: 'md' },
      children: ['m1', 'm2', 'm3', 'm4'],
    },
    m1: metric('Opt-ins', 176, 'number', 'NEW_VALUE = true, last 90 days', 'neutral'),
    m2: metric('Opt-outs', 38, 'number', 'NEW_VALUE = false, last 90 days', 'neutral'),
    m3: metric('Opt-in rate', 0.822, 'percent', '176 of 214 total changes', 'neutral'),
    m4: metric('Total consent changes', 214, 'number', 'Opt-ins + opt-outs, 90 days', 'neutral'),
    triage: {
      type: 'Heading',
      children: [],
      props: { text: 'Cookie & data-flow triage', variant: 'section' },
    },
    cookies: bar('Cookies', '11 total', 4, 7, 0),
    flows: bar('Data flows', '275 total', 269, 6, 0),
  },
};

const body = renderToStaticMarkup(
  createElement(
    PeriodChangeProvider,
    { value: {} },
    createElement(
      JSONUIProvider,
      { registry },
      createElement(Renderer, { spec: spec as unknown as Spec, registry }),
    ),
  ),
);

// Dark page background stands in for a dark host such as Claude.
writeFileSync(
  new URL('../preview.html', import.meta.url),
  `<!doctype html><html><head><meta charset="utf-8"><style>${css}
  html,body{margin:0;background:#1a1a19;padding:16px;width:1024px}</style></head>
  <body><div class="flex flex-col gap-4 rounded-lg bg-card-sunken px-4 py-4">${body}</div></body></html>`,
);
logger.log('wrote preview.html');
