import { useMcpApp } from '@transcend-io/mcp-server-base/ui';
import { useEffect, useState, type ReactNode } from 'react';

import { BulkApproveBanner } from './BulkApproveBanner.js';
import { ClassificationFields } from './ClassificationFields.js';
import { SuggestedAction } from './SuggestedAction.js';
import { TriageActions } from './TriageActions.js';
import { TriageIdentity } from './TriageIdentity.js';
import { TriageProgress } from './TriageProgress.js';
import type { CookieTriageDraft, CookieTriageViewData } from './types.js';

/** Shared card chrome for loading, error, empty, and loaded states. */
const CARD = 'rounded-lg border border-line bg-surface-raised px-6 py-5 shadow-sm';

/**
 * Seeds local draft classification from the current server item.
 *
 * @param data - Latest view payload
 * @returns Draft purpose/service for the selectors
 */
function draftFromData(data: CookieTriageViewData | undefined): CookieTriageDraft {
  const classification = data?.item?.classification;
  return {
    purposeSlug: classification?.purposeSlug ?? '',
    purposeId: classification?.purposeId ?? '',
    service: classification?.service || classification?.serviceKey || '',
  };
}

/** Props for a transient status card (connecting, error, empty). */
interface StatusCardProps {
  /** Heading shown at the top of the card */
  title: string;
  /** Body content under the title */
  children: ReactNode;
  /** When true, style as an error alert */
  alert?: boolean;
  /** When true, mark the region as busy for assistive tech */
  busy?: boolean;
}

/** Connection / empty-state shell with consistent chrome. */
function StatusCard({ title, children, alert, busy }: StatusCardProps) {
  return (
    <section
      className={`${CARD}${alert ? ' border-l-4 border-l-danger' : ''}`}
      role={alert ? 'alert' : undefined}
      aria-busy={busy || undefined}
    >
      <h1 className="mb-1 text-heading-md font-semibold text-content">{title}</h1>
      <div className="text-sm text-content-muted">{children}</div>
    </section>
  );
}

/**
 * Interactive cookie / data-flow triage card.
 *
 * Matches the Cookie review / Data flow review design: progress, identity,
 * suggested action, purpose/service selectors, bulk approve, and Approve / Junk.
 * Mutations go through the app-only `consent_cookie_triage_act` companion; each
 * successful call replaces `data` with the next card.
 */
export function CookieTriageView() {
  const { data, isConnected, connectionError, toolError, isCallingTool, callTool } =
    useMcpApp<CookieTriageViewData>({
      appInfo: { name: 'transcend-consent-cookie-triage', version: '1.0.0' },
    });

  const [draft, setDraft] = useState<CookieTriageDraft>(() => draftFromData(data));

  useEffect(() => {
    setDraft(draftFromData(data));
  }, [data]);

  if (connectionError) {
    return (
      <StatusCard title="Could not reach the host" alert>
        {connectionError.message}
      </StatusCard>
    );
  }

  if (!isConnected) {
    return (
      <StatusCard title="Connecting…" busy>
        Waiting for the host handshake.
      </StatusCard>
    );
  }

  if (!data) {
    return (
      <StatusCard title="Loading…" busy>
        Fetching the triage queue.
      </StatusCard>
    );
  }

  if (!data.item || !data.reviewType || !data.total) {
    return (
      <StatusCard title="All caught up">
        Nothing left in the needs-review queue for cookies or data flows.
      </StatusCard>
    );
  }

  const { item, reviewType, index = 1, total, options, skippedIds = [] } = data;
  const reviewTitle = reviewType === 'data_flow' ? 'Data flow review' : 'Cookie review';

  const act = (
    action: 'approve' | 'junk' | 'skip' | 'approve_siblings',
    extra: Record<string, unknown> = {},
  ) => {
    void callTool('consent_cookie_triage_act', {
      action,
      id: item.id,
      reviewType,
      purposeSlug: draft.purposeSlug || undefined,
      purposeId: draft.purposeId || undefined,
      service: draft.service.trim() || undefined,
      skippedIds,
      ...extra,
    });
  };

  return (
    <section className={CARD}>
      <p className="mb-0.5 text-sm font-medium text-brand-text">Transcend</p>
      <h1 className="mb-4 text-heading-md font-semibold text-content">{reviewTitle}</h1>

      <TriageProgress
        reviewType={reviewType}
        index={index}
        total={total}
        disabled={isCallingTool}
        onSkip={() => act('skip')}
      />

      <TriageIdentity reviewType={reviewType} item={item} />

      <SuggestedAction suggestion={item.suggestion} />

      <ClassificationFields
        options={options ?? { purposes: [], services: [] }}
        draft={draft}
        disabled={isCallingTool}
        onChange={setDraft}
      />

      {item.bulkGroup ? (
        <BulkApproveBanner
          reviewType={reviewType}
          bulkGroup={item.bulkGroup}
          disabled={isCallingTool}
          onApproveAll={() =>
            act('approve_siblings', { siblingIds: item.bulkGroup?.siblingIds ?? [] })
          }
        />
      ) : null}

      {toolError ? (
        <p className="mb-3 text-sm text-danger" role="alert">
          {toolError}
        </p>
      ) : null}

      <TriageActions
        disabled={isCallingTool}
        onApprove={() => act('approve')}
        onJunk={() => act('junk')}
      />
    </section>
  );
}
