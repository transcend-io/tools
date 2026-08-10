import { Button, ButtonVariant, Card, ProgressBar, RightCaretIcon } from '@transcend-io/mcp-app-ui';
import { useMcpApp } from '@transcend-io/mcp-server-base/ui';
import { useCallback, useEffect, useState } from 'react';

import { BulkApproveBanner } from './BulkApproveBanner.js';
import { ClassificationFields } from './ClassificationFields.js';
import { SuggestedAction } from './SuggestedAction.js';
import { TriageActions } from './TriageActions.js';
import { TriageIdentity } from './TriageIdentity.js';
import { TriageProgress } from './TriageProgress.js';
import type { CookieTriageDraft, CookieTriageViewData } from './types.js';

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

/**
 * Interactive cookie / data-flow triage card.
 *
 * Matches the Cookie review / Data flow review design: progress, identity,
 * suggested action, purpose/service selectors, bulk approve, and Approve / Junk.
 * Mutations go through the app-only `consent_cookie_triage_act` companion; each
 * successful call replaces `data` with the next card.
 */
export function CookieTriageView() {
  const payload = useMcpApp<CookieTriageViewData>({
    appInfo: { name: 'transcend-consent-cookie-triage', version: '1.0.0' },
  });

  console.log(payload);

  const { data, isConnected, connectionError, toolError, isCallingTool, callTool } = payload;

  const { item, reviewType, index, total, options, skippedIds = [] } = data ?? {};

  const { id, identifier } = item ?? {};

  const act = useCallback(
    (action: 'approve' | 'junk' | 'skip' | 'approve_siblings') =>
      callTool('consent_cookie_triage_act', {
        action,
        id: id,
        reviewType,
        skippedIds,
      }),
    [callTool, id, reviewType, skippedIds],
  );

  if (!data) {
    return <div>Loading...</div>;
  }

  return (
    <Card className="flex flex-col gap-4">
      {/** Constant header content */}
      <div className="border-b border-line -mx-5 px-5">
        <div className="flex gap-2 items-center font-heading-sm pb-4">
          <span className="bg-brand rounded-lg w-7 h-4 flex items-center justify-center text-sm font-semibold text-content-inverse">
            T
          </span>
          <span className="text-content">Transcend</span>
          <span className="text-content-subtle">Cookie review</span>
        </div>
        <div className="w-full flex justify-between pb-1">
          <span className="text-content-subtle text-sm uppercase">
            Cookie {index} of {total}
          </span>
          <Button
            variant={ButtonVariant.Link}
            onClick={() => act('skip')}
            className="flex items-center gap-1 text-sm text-content"
          >
            Skip <RightCaretIcon className="w-3 h-3 text-content" />
          </Button>
        </div>
        <ProgressBar currentStep={index!} totalSteps={total!} backgroundClassName="h-2" />
      </div>
      <div>
        <h1 className="mb-4 text-heading-md font-semibold text-content">{identifier}</h1>
        <div className="flex gap-3">
          <Button variant={ButtonVariant.Success} className="flex-1" onClick={() => act('approve')}>
            Approve
          </Button>
          <Button variant={ButtonVariant.Danger} className="flex-1" onClick={() => act('junk')}>
            Junk
          </Button>
        </div>
      </div>
    </Card>
  );

  // const [draft, setDraft] = useState<CookieTriageDraft>(() => draftFromData(data));

  // useEffect(() => {
  //   setDraft(draftFromData(data));
  // }, [data]);

  // if (connectionError) {
  //   return (
  //     <StatusCard title="Could not reach the host" alert>
  //       {connectionError.message}
  //     </StatusCard>
  //   );
  // }

  // if (!isConnected) {
  //   return (
  //     <StatusCard title="Connecting…" busy>
  //       Waiting for the host handshake.
  //     </StatusCard>
  //   );
  // }

  // if (!data) {
  //   return (
  //     <StatusCard title="Loading…" busy>
  //       Fetching the triage queue.
  //     </StatusCard>
  //   );
  // }

  // if (!data.item || !data.reviewType || !data.total) {
  //   return (
  //     <StatusCard title="All caught up">
  //       Nothing left in the needs-review queue for cookies or data flows.
  //     </StatusCard>
  //   );
  // }

  // const { item, reviewType, index = 1, total, options, skippedIds = [] } = data;
  // const reviewTitle = reviewType === 'data_flow' ? 'Data flow review' : 'Cookie review';

  // const act = (
  //   action: 'approve' | 'junk' | 'skip' | 'approve_siblings',
  //   extra: Record<string, unknown> = {},
  // ) => {
  //   void callTool('consent_cookie_triage_act', {
  //     action,
  //     id: item.id,
  //     reviewType,
  //     purposeSlug: draft.purposeSlug || undefined,
  //     purposeId: draft.purposeId || undefined,
  //     service: draft.service.trim() || undefined,
  //     skippedIds,
  //     ...extra,
  //   });
  // };

  // return (
  //   <Card>
  //     <p className="mb-0.5 text-sm font-medium text-brand-text">Transcend</p>
  //     <h1 className="mb-4 text-heading-md font-semibold text-content">{reviewTitle}</h1>

  //     <TriageProgress
  //       reviewType={reviewType}
  //       index={index}
  //       total={total}
  //       disabled={isCallingTool}
  //       onSkip={() => act('skip')}
  //     />

  //     <TriageIdentity reviewType={reviewType} item={item} />

  //     <SuggestedAction suggestion={item.suggestion} />

  //     <ClassificationFields
  //       options={options ?? { purposes: [], services: [] }}
  //       draft={draft}
  //       disabled={isCallingTool}
  //       onChange={setDraft}
  //     />

  //     {item.bulkGroup ? (
  //       <BulkApproveBanner
  //         reviewType={reviewType}
  //         bulkGroup={item.bulkGroup}
  //         disabled={isCallingTool}
  //         onApproveAll={() =>
  //           act('approve_siblings', { siblingIds: item.bulkGroup?.siblingIds ?? [] })
  //         }
  //       />
  //     ) : null}

  //     {toolError ? (
  //       <p className="mb-3 text-sm text-danger" role="alert">
  //         {toolError}
  //       </p>
  //     ) : null}

  //     <TriageActions
  //       disabled={isCallingTool}
  //       onApprove={() => act('approve')}
  //       onJunk={() => act('junk')}
  //     />
  //   </Card>
  // );
}
