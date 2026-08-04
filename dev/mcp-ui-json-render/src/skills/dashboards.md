# Building Transcend dashboards

How to turn Transcend MCP tool results into a rendered dashboard using `ui_render`.

## Hard rule

**Do not build the dashboard yourself.** Do not write HTML, React, Python, or
matplotlib. Do not produce a code artifact, an SVG, an ASCII chart, or a
markdown table as a substitute for the UI.

`ui_render` already renders the dashboard, in about a second, using Transcend's
design system. Improvising one takes minutes and produces something off-brand
and non-interactive. If the data does not fit the catalog below, render what
does fit and describe the rest in text.

## When to use this

Any request for a dashboard, overview, summary, breakdown, report, or "how are
we doing on X" against Transcend data — consent activity, cookie and data-flow
triage, inventory counts, request volumes.

## Workflow

1. **Fetch data first.** Call the Transcend data tools for the numbers you need.
   Never invent values, and never call `ui_render` with placeholder data.
2. **Map results to components** using the table below.
3. **Call `ui_render` once** with the full spec.
4. **Keep the text answer short.** The UI carries the numbers; two or three
   sentences of interpretation is enough. Do not restate every value in prose.

For a slow multi-step fetch, you may call `ui_render` early with the metrics you
already have and again once the rest arrives. Each call replaces the view, so
the second spec must be complete, not a patch.

## Data source → component

| Data                  | Tool                                                                                                | Render as                                        |
| --------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Opt-ins / opt-outs    | `consent_get_aggregate_analytics` with `metric: CONSENT_CHANGED`, `include_dimensions: [NEW_VALUE]` | One `MetricCard` per value in a 4-column `Grid`  |
| Sessions / page views | `consent_get_aggregate_analytics` with `metric: SITE_SESSIONS` or `PAGE_VIEWS`                      | `MetricCard`, `format: 'compact'`                |
| Cookie triage         | `consent_get_inventory_stats` → `cookies`                                                           | `ProgressBar`, one segment per status            |
| Data-flow triage      | `consent_get_inventory_stats` → `dataFlows`                                                         | `ProgressBar`, one segment per status            |
| Anything time-series  | `consent_get_timeseries_analytics`                                                                  | Not in the catalog — summarize the trend in text |

Triage segments use a consistent tone: live/approved is `success`, needs review
is `warning`, junk is `danger`.

## Spec format

The spec is flat: `root` names the entry element, and `elements` maps keys to
`{ type, props, children? }`. `children` holds keys, not nested objects.

A dashboard's root should be a `Grid` with `columns: 1`, stacking headings,
nested grids, and bars vertically.

```json
{
  "root": "page",
  "elements": {
    "page": {
      "type": "Grid",
      "props": { "columns": 1 },
      "children": ["header", "kpis", "triageHeading", "cookies"]
    },
    "header": {
      "type": "Heading",
      "props": {
        "text": "Consent activity",
        "variant": "eyebrow",
        "periods": ["7d", "30d", "90d", "6mo"],
        "selectedPeriod": "90d"
      }
    },
    "kpis": {
      "type": "Grid",
      "props": { "columns": 4 },
      "children": ["optIns", "optOuts", "rate", "total"]
    },
    "optIns": {
      "type": "MetricCard",
      "props": {
        "label": "Opt-ins",
        "value": 176,
        "format": "number",
        "note": { "text": "NEW_VALUE = true, last 90 days", "tone": "neutral" }
      }
    },
    "optOuts": {
      "type": "MetricCard",
      "props": { "label": "Opt-outs", "value": 38, "format": "number" }
    },
    "rate": {
      "type": "MetricCard",
      "props": { "label": "Opt-in rate", "value": 0.822, "format": "percent" }
    },
    "total": {
      "type": "MetricCard",
      "props": { "label": "Total changes", "value": 214, "format": "number" }
    },
    "triageHeading": {
      "type": "Heading",
      "props": { "text": "Cookie triage", "variant": "section" }
    },
    "cookies": {
      "type": "ProgressBar",
      "props": {
        "label": "Cookies",
        "caption": "11 total",
        "segments": [
          { "label": "Live", "value": 4, "tone": "success" },
          { "label": "Need review", "value": 7, "tone": "warning" },
          { "label": "Junk", "value": 0, "tone": "danger" }
        ]
      }
    }
  }
}
```

## Rules that are easy to get wrong

- **`percent` takes a fraction.** Pass `0.822` to render `82.2%`. Passing `82.2`
  renders `8,220%`.
- **Pass raw numbers, never pre-formatted strings.** `1020000`, not `"1.02M"`.
  `format: 'compact'` produces `1.02M`.
- **Use `tone: 'neutral'` for context notes.** Green and red are for genuinely
  good or bad news, such as a sync failure. Coloring a filter description like
  `NEW_VALUE = true` makes the card read as an alert.
- **`deltaTone` is independent of `direction`.** A rise in opt-outs points up and
  is `negative`.
- **Add period chips when the data is time-scoped.** Pass
  `periods: ['7d','30d','90d','6mo']` on the top heading with `selectedPeriod`
  matching the window you queried (`90d` for `days: 90`). Clicking a chip asks
  you to refetch at the new window and call `ui_render` again — do that, and
  update `selectedPeriod` to match.
- **`Grid` columns cap at 4.** More than four metrics means a second row.

## If the host cannot render UI

`ui_render` returns a prose summary on hosts without MCP Apps support. Call it
anyway and present that summary. Still do not hand-build a substitute.
