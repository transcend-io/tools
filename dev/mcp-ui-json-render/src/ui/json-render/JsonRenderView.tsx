import type { Spec } from '@json-render/core';
import { JSONUIProvider, Renderer } from '@json-render/react';
import { useMcpApp } from '@transcend-io/mcp-server-base/ui';
import { useCallback, useMemo } from 'react';

import type { UiSpec } from '../../catalog.ts';
import { PeriodChangeProvider, type PeriodChangeContextValue } from './components/Heading.tsx';
import { registry } from './registry.tsx';

/** Payload shape returned by `ui_render`. */
interface JsonRenderData {
  /** Flat json-render spec to paint */
  spec?: UiSpec;
}

/**
 * Classes shared by the card in every state, so connecting and error cannot
 * drift from the loaded view.
 */
const CARD = 'rounded-lg bg-surface-raised px-6 py-5 shadow-sm';
const TITLE = 'mb-1 text-heading-md font-semibold text-content';
const SUBTITLE = 'text-sm text-content-muted';

/** Maps a period chip to the `days` argument consent analytics tools expect. */
function periodToDays(period: string): number {
  switch (period) {
    case '7d':
      return 7;
    case '30d':
      return 30;
    case '90d':
      return 90;
    case '6mo':
      return 180;
    default:
      return 90;
  }
}

/**
 * Generic json-render host view.
 *
 * B-lite: each `ui_render` tool result replaces the held spec wholesale via
 * `ontoolresult`, so the agent can call the tool twice — once with a skeleton,
 * once with real values — and the view updates without a page reload.
 *
 * Period chips on Heading ask the host (via `sendMessage`) to refetch analytics
 * for the new window and call `ui_render` again.
 *
 * Styled with utilities from `@transcend-io/mcp-server-base/ui/theme.css`.
 */
export function JsonRenderView() {
  const { app, data, isConnected, connectionError, toolError } = useMcpApp<JsonRenderData>({
    appInfo: { name: 'transcend-ui-json-render', version: '1.0.0' },
  });

  const onPeriodChange = useCallback(
    async (period: string) => {
      if (!app) return;
      const days = periodToDays(period);
      try {
        await app.sendMessage({
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                `Update this dashboard for the ${period} window (${days} days). ` +
                `Call consent_get_aggregate_analytics with days: ${days} (keep the same metric ` +
                `and dimensions), then call ui_render again with an updated spec — set the ` +
                `Heading selectedPeriod to "${period}" and refresh MetricCard values from the ` +
                `new results. Do not only summarize in text.`,
            },
          ],
        });
      } catch {
        // Host may not support ui/message; selection still updates locally.
      }
    },
    [app],
  );

  const periodContext = useMemo<PeriodChangeContextValue>(
    () => ({ onPeriodChange }),
    [onPeriodChange],
  );

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

  if (toolError) {
    return (
      <section className={`${CARD} border-l-4 border-l-danger`} role="alert">
        <h1 className={TITLE}>Could not render UI</h1>
        <p className={SUBTITLE}>{toolError}</p>
      </section>
    );
  }

  const spec = data?.spec as Spec | undefined;
  if (!spec) {
    return (
      <section className={CARD} aria-busy="true">
        <h1 className={TITLE}>Waiting for a spec…</h1>
        <p className={SUBTITLE}>Call ui_render with a json-render spec to paint this view.</p>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg bg-card-sunken px-4 py-4">
      <PeriodChangeProvider value={periodContext}>
        <JSONUIProvider registry={registry}>
          <Renderer spec={spec} registry={registry} />
        </JSONUIProvider>
      </PeriodChangeProvider>
    </div>
  );
}
