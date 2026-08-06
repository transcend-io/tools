import type { ReactNode } from 'react';

import type { CookieTriageItem, CookieTriageReviewType } from './types.js';

/** Props for {@link TriageIdentity}. */
export interface TriageIdentityProps {
  /** Cookie or data-flow review */
  reviewType: CookieTriageReviewType;
  /** Item under review */
  item: CookieTriageItem;
}

/** Props for a labeled identity field. */
interface IdentityFieldProps {
  /** Field label shown above the value */
  label: string;
  /** Field value content */
  children: ReactNode;
  /** When true, render the value in monospace brand color */
  mono?: boolean;
  /** When true, render the value muted and italic */
  muted?: boolean;
}

/** One labeled field in the identity block. */
function IdentityField({ label, children, mono, muted }: IdentityFieldProps) {
  return (
    <div className="mb-3">
      <p className="mb-1 text-sm font-medium text-content-subtle uppercase">{label}</p>
      <div
        className={[
          'rounded-sm border border-line px-2.5 py-1.5 text-sm',
          mono ? 'font-mono wrap-anywhere text-brand-text' : '',
          muted ? 'text-content-muted italic' : 'text-content',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Identifier, description, source, and occurrences for the current item.
 */
export function TriageIdentity({ reviewType, item }: TriageIdentityProps) {
  const identifierLabel = reviewType === 'data_flow' ? 'Domain' : 'Cookie name';

  return (
    <div className="mb-5">
      <IdentityField label={identifierLabel} mono>
        {item.identifier}
      </IdentityField>
      <IdentityField label="Description" muted={item.description === 'No description on file'}>
        {item.description}
      </IdentityField>
      <IdentityField label="Source">{item.source}</IdentityField>
      <IdentityField label="Occurrences">{item.occurrences.summary}</IdentityField>
    </div>
  );
}
