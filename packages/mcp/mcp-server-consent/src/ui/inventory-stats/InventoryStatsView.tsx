import { useMcpApp } from '@transcend-io/mcp-server-base/ui';

import { Grid } from './components/Grid.tsx';
import { Heading } from './components/Heading.tsx';
import { MetricCard } from './components/MetricCard.tsx';
import { ProgressBar } from './components/ProgressBar.tsx';

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

/** Classes shared by every state, so none can drift from the loaded one. */
const PANEL = 'flex flex-col gap-4 rounded-lg bg-card-sunken px-4 py-4';
const CARD = 'rounded-lg bg-surface-raised px-6 py-5 shadow-sm';
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
    { label: 'Live', value: stats?.liveCount ?? 0, tone: 'success' as const },
    { label: 'Needs review', value: stats?.needReviewCount ?? 0, tone: 'warning' as const },
    { label: 'Junk', value: stats?.junkCount ?? 0, tone: 'danger' as const },
  ];
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

  if (!isConnected) {
    return (
      <section className={CARD} aria-busy="true">
        <h1 className={TITLE}>Connecting…</h1>
        <p className={SUBTITLE}>Waiting for the host handshake.</p>
      </section>
    );
  }

  const cookieTotal = totalOf(data?.cookies);
  const dataFlowTotal = totalOf(data?.dataFlows);
  const needsReviewTotal =
    (data?.cookies?.needReviewCount ?? 0) + (data?.dataFlows?.needReviewCount ?? 0);

  return (
    <div className={PANEL}>
      <Heading text="Inventory triage" variant="title" />

      {toolError ? (
        <p className="text-sm text-danger" role="alert">
          {toolError}
        </p>
      ) : null}

      <Grid columns={3}>
        <MetricCard label="Cookies" value={cookieTotal} format="number" />
        <MetricCard label="Data flows" value={dataFlowTotal} format="number" />
        <MetricCard
          label="Needs review"
          value={needsReviewTotal}
          format="number"
          note={
            needsReviewTotal > 0
              ? { text: 'Across cookies and data flows', tone: 'neutral' }
              : undefined
          }
        />
      </Grid>

      <Grid columns={1}>
        <ProgressBar label="Cookie triage" segments={triageSegments(data?.cookies)} />
        <ProgressBar label="Data flow triage" segments={triageSegments(data?.dataFlows)} />
      </Grid>
    </div>
  );
}
