import { useMcpApp } from '@transcend-io/mcp-server-base/ui';
import {
  Grid,
  Heading,
  HeadingVariant,
  MetricCard,
  type MetricCardProps,
  MetricFormat,
  MetricTone,
  ProgressBar,
  ProgressTone,
  Spinner,
} from '@transcend-io/mcp-ui-common';

/** Tracker triage counts returned for cookies or data flows. */
interface TrackerStats {
  /** Number of live (approved) items */
  liveCount?: number;
  /** Number of items needing review */
  needReviewCount?: number;
  /** Number of junked items */
  junkCount?: number;
}

/** Payload shape returned by `consent_get_inventory_stats`. */
interface InventoryStatsData {
  /** Cookie triage counts */
  cookies?: TrackerStats;
  /** Data-flow triage counts */
  dataFlows?: TrackerStats;
}

/**
 * Classes shared by every state, so none can drift from the loaded one.
 *
 * Both are capped and centered: a maximized host panel is several times wider
 * than this dashboard has content for, and stretching to fill it turns the KPI
 * cards into letterboxes.
 */
const PANEL = 'mx-auto flex w-full max-w-view flex-col gap-4 rounded-lg bg-card-sunken px-4 py-4';
const CARD = 'mx-auto w-full max-w-view rounded-lg bg-surface-raised px-6 py-5 shadow-sm';
const TITLE = 'mb-1 text-heading-md font-semibold text-content';
const SUBTITLE = 'text-sm text-content-muted';

/** Sum of live + needs-review + junk, treating missing fields as zero. */
function totalOf(stats: TrackerStats | undefined): number {
  if (!stats) return 0;
  return (stats.liveCount ?? 0) + (stats.needReviewCount ?? 0) + (stats.junkCount ?? 0);
}

/** Triage segments for a ProgressBar from tracker stats. */
function triageSegments(stats: TrackerStats | undefined) {
  return [
    { label: 'Live', value: stats?.liveCount ?? 0, tone: ProgressTone.Success },
    { label: 'Needs review', value: stats?.needReviewCount ?? 0, tone: ProgressTone.Warning },
    { label: 'Junk', value: stats?.junkCount ?? 0, tone: ProgressTone.Danger },
  ];
}

/** Rounded whole-percent share, for note text like `86% live`. */
function percentOf(part: number, total: number): string {
  return `${Math.round((part / total) * 100)}%`;
}

/**
 * Note under a cookie or data-flow total.
 *
 * The bar further down lists every raw count already, so the note carries the
 * one thing those counts do not show at a glance: how settled the type is.
 */
function triageNote(stats: TrackerStats | undefined): MetricCardProps['note'] {
  const total = totalOf(stats);
  if (total === 0) {
    return { text: 'Nothing scanned yet', tone: MetricTone.Neutral };
  }
  if ((stats?.needReviewCount ?? 0) === 0) {
    return { text: 'Fully triaged', tone: MetricTone.Positive };
  }
  return { text: `${percentOf(stats?.liveCount ?? 0, total)} live`, tone: MetricTone.Neutral };
}

/**
 * Note under the review backlog, weighing it against everything scanned.
 *
 * A bare count cannot say whether 40 items is most of the inventory or a
 * rounding error, and that is the difference between urgent and routine.
 */
function backlogNote(needsReview: number, inventoryTotal: number): MetricCardProps['note'] {
  if (inventoryTotal === 0) {
    return undefined;
  }
  if (needsReview === 0) {
    return { text: 'Nothing waiting', tone: MetricTone.Positive };
  }
  return {
    text: `${percentOf(needsReview, inventoryTotal)} of inventory`,
    tone: MetricTone.Neutral,
  };
}

/**
 * Interactive inventory triage dashboard for `consent_get_inventory_stats`.
 *
 * Shows cookie and data-flow live / needs-review / junk breakdowns. Styled only
 * with utilities from `@transcend-io/mcp-server-base/ui/theme.css`.
 */
export function InventoryStatsView() {
  const { data, isConnected, connectionError, toolError } = useMcpApp<InventoryStatsData>({
    appInfo: { name: 'transcend-consent-inventory-stats', version: '1.0.0' },
  });

  if (connectionError) {
    return (
      <section className={`${CARD} border-l-4 border-l-danger`} role="alert">
        <h1 className={TITLE}>Could not reach the host</h1>
        <p className={SUBTITLE}>{connectionError.message}</p>
      </section>
    );
  }

  if (toolError !== undefined && data === undefined) {
    return (
      <div className={PANEL}>
        <Heading text="Consent Inventory triage" variant={HeadingVariant.Title} />
        <p className="text-sm text-danger" role="alert">
          {toolError}
        </p>
      </div>
    );
  }

  if (!isConnected || data === undefined) {
    // Handshake is fast; the first `tool-result` waits on lazy OAuth and GraphQL.
    // Rendering zeros here looks like empty inventory rather than a load.
    return (
      <div className={PANEL}>
        <Heading text="Consent Inventory triage" variant={HeadingVariant.Title} />
        <Spinner label={!isConnected ? 'Connecting to the host…' : 'Loading inventory…'} />
      </div>
    );
  }

  const cookieTotal = totalOf(data.cookies);
  const dataFlowTotal = totalOf(data.dataFlows);
  const needsReviewTotal =
    (data.cookies?.needReviewCount ?? 0) + (data.dataFlows?.needReviewCount ?? 0);

  return (
    <div className={PANEL}>
      <Heading text="Consent Inventory triage" variant={HeadingVariant.Title} />

      {toolError ? (
        <p className="text-sm text-danger" role="alert">
          {toolError}
        </p>
      ) : null}

      <Grid columns={3}>
        <MetricCard
          label="Cookies"
          value={cookieTotal}
          format={MetricFormat.Number}
          note={triageNote(data.cookies)}
        />
        <MetricCard
          label="Data flows"
          value={dataFlowTotal}
          format={MetricFormat.Number}
          note={triageNote(data.dataFlows)}
        />
        <MetricCard
          label="Needs review"
          value={needsReviewTotal}
          format={MetricFormat.Number}
          note={backlogNote(needsReviewTotal, cookieTotal + dataFlowTotal)}
        />
      </Grid>

      <Grid columns={1}>
        <ProgressBar label="Cookie triage" segments={triageSegments(data.cookies)} />
        <ProgressBar label="Data flow triage" segments={triageSegments(data.dataFlows)} />
      </Grid>
    </div>
  );
}
