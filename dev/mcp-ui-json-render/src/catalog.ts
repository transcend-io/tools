import { defineCatalog } from '@json-render/core';
import { schema } from '@json-render/react/schema';
import { z } from 'zod';

/** Heading size / weight used in dashboard section headers. */
export const HeadingVariantSchema = z.enum(['eyebrow', 'title', 'section']);

/** Time-range chips shown next to a Heading (Figma consent activity). */
export const PeriodSchema = z.enum(['7d', '30d', '90d', '6mo']);

/** Number formatting applied by MetricCard (agent supplies raw numbers). */
export const MetricFormatSchema = z.enum(['compact', 'number', 'percent']);

/** Visual tone for a MetricCard delta or note. */
export const MetricToneSchema = z.enum(['positive', 'negative', 'neutral']);

/** Arrow direction for a MetricCard change indicator. */
export const MetricDirectionSchema = z.enum(['up', 'down']);

/** Segment fill tone for ProgressBar. */
export const ProgressToneSchema = z.enum(['brand', 'success', 'warning', 'danger', 'neutral']);

/** Props for the Heading component. */
export const HeadingPropsSchema = z.object({
  /** Display text */
  text: z.string().describe('Heading text to display.'),
  /** Visual variant; defaults to title when omitted */
  variant: HeadingVariantSchema.nullable()
    .optional()
    .describe(
      "Visual style: 'eyebrow' (uppercase letter-spaced), 'title' (page heading), or 'section' (subsection).",
    ),
  /** Optional time-range chips (7d / 30d / 90d / 6mo), shown to the right of the title */
  periods: z
    .array(PeriodSchema)
    .nullable()
    .optional()
    .describe(
      "Optional period chips, e.g. ['7d','30d','90d','6mo']. Use on consent-activity headings; " +
        'selecting a chip asks the host to refetch analytics for that window and re-call ui_render.',
    ),
  /** Which period chip is selected; should match the query window used for the metrics */
  selectedPeriod: PeriodSchema.nullable()
    .optional()
    .describe("Selected period chip, e.g. '90d' when the analytics call used days: 90."),
});

/** Optional change indicator under a MetricCard value. */
export const MetricDeltaSchema = z.object({
  /** Numeric change amount (already the percent or absolute the label describes) */
  value: z.number().describe('Change amount shown next to the arrow, e.g. 9 for 9%.'),
  /** Arrow direction */
  direction: MetricDirectionSchema.describe("Arrow direction: 'up' or 'down'."),
  /** Human-readable suffix after the value, e.g. 'vs prior quarter' */
  label: z.string().describe("Text after the value, e.g. 'vs prior quarter'."),
});

/** Optional status note under a MetricCard (alerts without a delta). */
export const MetricNoteSchema = z.object({
  /** Note text */
  text: z.string().describe('Status or alert text shown under the value.'),
  /** Visual tone */
  tone: MetricToneSchema.describe(
    "Tone: 'positive' (green) and 'negative' (red) only when the note reports something " +
      "genuinely good or bad, e.g. a sync failure. Use 'neutral' for plain context such as " +
      "'176 of 214 total changes' or a filter description — coloring context text makes the " +
      'card read like an alert.',
  ),
});

/** Props for the MetricCard component. */
export const MetricCardPropsSchema = z.object({
  /** Small label above the value */
  label: z.string().describe("Metric label, e.g. 'Opt-ins'."),
  /** Raw numeric value; the component formats it */
  value: z.coerce
    .number()
    .describe('Raw numeric value. Prefer numbers over pre-formatted strings.'),
  /** How to format value; defaults to compact */
  format: MetricFormatSchema.nullable()
    .optional()
    .describe(
      "Format: 'compact' (1.02M), 'number', or 'percent'. Defaults to compact. " +
        "'percent' expects a fraction, so pass 0.822 to render 82.2%.",
    ),
  /** Optional change vs prior period */
  delta: MetricDeltaSchema.nullable()
    .optional()
    .describe('Optional change indicator. Tone is set separately via deltaTone.'),
  /** Color of the delta row; independent of direction */
  deltaTone: MetricToneSchema.nullable()
    .optional()
    .describe(
      "Delta color: 'positive' (green), 'negative' (red), or 'neutral'. Independent of direction.",
    ),
  /** Optional status note when there is no delta */
  note: MetricNoteSchema.nullable()
    .optional()
    .describe('Optional status note (e.g. sync failure). Prefer note OR delta, not both.'),
});

/** One segment of a ProgressBar. */
export const ProgressSegmentSchema = z.object({
  /** Segment label for the legend */
  label: z.string().describe("Segment label, e.g. 'Live'."),
  /** Absolute count; width is proportional to the sum of all segments */
  value: z.coerce.number().describe('Absolute count for this segment.'),
  /** Fill color */
  tone: ProgressToneSchema.describe(
    "Fill tone: 'brand', 'success', 'warning', 'danger', or 'neutral'.",
  ),
});

/** Props for the ProgressBar component. */
export const ProgressBarPropsSchema = z.object({
  /** Title above the bar */
  label: z.string().describe("Bar title, e.g. 'Cookie triage'."),
  /** Ordered segments that make up the bar */
  segments: z
    .array(ProgressSegmentSchema)
    .min(1)
    .describe('One or more segments. Widths are proportional to values.'),
  /** Optional caption under the bar */
  caption: z
    .string()
    .nullable()
    .optional()
    .describe('Optional caption under the bar, e.g. total count summary.'),
});

/** Props for the Grid component. */
export const GridPropsSchema = z.object({
  /** Number of columns (1–4) */
  columns: z.coerce
    .number()
    .int()
    .min(1)
    .max(4)
    .describe('Number of equal columns (1–4). Children fill the grid.'),
});

/** One element in a flat json-render spec. */
export const SpecElementSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('Heading'),
    props: HeadingPropsSchema,
    children: z.array(z.string()).optional(),
  }),
  z.object({
    type: z.literal('MetricCard'),
    props: MetricCardPropsSchema,
    children: z.array(z.string()).optional(),
  }),
  z.object({
    type: z.literal('ProgressBar'),
    props: ProgressBarPropsSchema,
    children: z.array(z.string()).optional(),
  }),
  z.object({
    type: z.literal('Grid'),
    props: GridPropsSchema,
    children: z.array(z.string()).optional(),
  }),
]);

/**
 * Flat json-render spec accepted by `ui_render`.
 *
 * The root element is rendered; children are referenced by key. Prefer a Grid
 * as root when laying out MetricCards side by side, or a single Heading /
 * ProgressBar for a one-component view.
 */
export const UiSpecSchema = z.object({
  root: z.string().describe('Key of the root element in elements.'),
  elements: z
    .record(z.string(), SpecElementSchema)
    .describe('Flat map of element key → { type, props, children? }.'),
});

export type UiSpec = z.infer<typeof UiSpecSchema>;
export type SpecElement = z.infer<typeof SpecElementSchema>;

/**
 * json-render catalog describing the four MVP components.
 *
 * Isomorphic: imported by the Node `ui_render` tool (for prompts / validation)
 * and by the browser registry that implements the components.
 */
export const catalog = defineCatalog(schema, {
  components: {
    Heading: {
      props: HeadingPropsSchema,
      description:
        'Section or page heading. Use variant "eyebrow" for uppercase letter-spaced labels ' +
        '(e.g. CONSENT ACTIVITY), "title" for the main heading, "section" for subsections. ' +
        "For time-scoped consent dashboards, pass periods: ['7d','30d','90d','6mo'] and " +
        'selectedPeriod matching the analytics window (e.g. 90d for days: 90).',
    },
    MetricCard: {
      props: MetricCardPropsSchema,
      description:
        'Rounded card showing a KPI: label, large formatted number, and optional delta or note. ' +
        'Pass raw numbers — the component formats them. Set deltaTone independently of direction ' +
        '(an increase in opt-outs is negative).',
    },
    ProgressBar: {
      props: ProgressBarPropsSchema,
      description:
        'Segmented progress bar for triage or composition breakdowns. Pass absolute counts per ' +
        'segment (e.g. live / needs review / junk); widths are proportional to the sum.',
    },
    Grid: {
      props: GridPropsSchema,
      slots: ['default'],
      description:
        'Equal-column grid (1–4). Put MetricCards as children for a KPI row. The root of a ' +
        'multi-section dashboard should itself be a Grid with columns: 1 whose children are ' +
        'Headings, nested Grids, and ProgressBars stacked vertically.',
    },
  },
  actions: {},
});
