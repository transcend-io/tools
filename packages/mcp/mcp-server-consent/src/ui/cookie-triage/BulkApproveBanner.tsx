import { Button } from '@transcend-io/mcp-app-ui';

import type { CookieTriageBulkGroup, CookieTriageReviewType } from './types.js';

/** Props for {@link BulkApproveBanner}. */
export interface BulkApproveBannerProps {
  /** Cookie or data-flow review */
  reviewType: CookieTriageReviewType;
  /** Bulk sibling group for the current item */
  bulkGroup: CookieTriageBulkGroup;
  /** Whether an act call is in flight */
  disabled: boolean;
  /** Approve the current item and its siblings */
  onApproveAll: () => void;
}

/**
 * Banner offering to approve the current item plus high-confidence siblings.
 */
export function BulkApproveBanner({
  reviewType,
  bulkGroup,
  disabled,
  onApproveAll,
}: BulkApproveBannerProps) {
  const total = bulkGroup.siblingCount + 1;
  const noun = reviewType === 'data_flow' ? 'flows' : 'cookies';

  return (
    <div className="mb-5 flex items-center gap-3 rounded-md border border-line bg-surface-sunken px-4 py-3">
      <p className="min-w-0 flex-1 text-sm text-content">
        {bulkGroup.siblingCount} more {bulkGroup.service} {noun} are high-confidence and fully
        classified. Approve this one and its {bulkGroup.siblingCount} siblings in a single step.
      </p>
      <Button variant="brand" disabled={disabled} onClick={onApproveAll}>
        ✓ Approve all {total}
      </Button>
    </div>
  );
}
