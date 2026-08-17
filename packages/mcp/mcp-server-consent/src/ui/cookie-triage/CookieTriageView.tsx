import { Button, ButtonVariant, Card, ProgressBar, RightCaretIcon } from '@transcend-io/mcp-app-ui';
import { useMcpApp } from '@transcend-io/mcp-server-base/ui';
import { useCallback } from 'react';

import type { CookieTriageViewData } from './types.js';

/**
 * Interactive cookie / data-flow triage card.
 *
 * Mutations go through the app-only `consent_cookie_triage_act` companion; each
 * successful call replaces `data` with the next card. Session cursors (after,
 * watermark, etc.) are round-tripped on every act call.
 */
export function CookieTriageView() {
  const payload = useMcpApp<CookieTriageViewData>({
    appInfo: { name: 'transcend-consent-cookie-triage', version: '1.0.0' },
  });

  const { data, callTool } = payload;

  const {
    item,
    reviewType,
    index,
    total,
    organization,
    after,
    headCreatedAt,
    headId,
    sessionIndex,
    dataFlowSkipCount,
    fromPeek,
    cardEndCursor,
    cardCookieId,
    cardCreatedAt,
  } = data ?? {};

  const { id, identifier } = item ?? {};

  const act = useCallback(
    (action: 'approve' | 'junk' | 'skip' | 'approve_siblings') =>
      callTool('consent_cookie_triage_act', {
        action,
        id,
        reviewType,
        after,
        headCreatedAt,
        headId,
        sessionIndex,
        dataFlowSkipCount,
        fromPeek,
        cardEndCursor,
        cardCookieId,
        cardCreatedAt,
      }),
    [
      callTool,
      id,
      reviewType,
      after,
      headCreatedAt,
      headId,
      sessionIndex,
      dataFlowSkipCount,
      fromPeek,
      cardEndCursor,
      cardCookieId,
      cardCreatedAt,
    ],
  );

  if (!data) {
    return <div>Loading...</div>;
  }

  const reviewLabel = reviewType === 'data_flow' ? 'Data flow' : 'Cookie';

  return (
    <Card className="flex flex-col gap-4">
      <div className="border-b border-line -mx-5 px-5">
        <div className="flex gap-2 items-center font-heading-sm pb-1">
          <span className="bg-brand rounded-lg w-7 h-4 flex items-center justify-center text-sm font-semibold text-content-inverse">
            T
          </span>
          <span className="text-content">Transcend</span>
          <span className="text-content-subtle">{reviewLabel} review</span>
        </div>
        {organization?.name ? (
          <p className="pb-3 text-sm text-content-subtle">{organization.name}</p>
        ) : (
          <div className="pb-3" />
        )}
        <div className="w-full flex justify-between pb-1">
          <span className="text-content-subtle text-sm uppercase">
            {reviewLabel} {index} of {total}
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
}
