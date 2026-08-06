import type { CookieTriageConfidence, CookieTriageSuggestion } from './types.js';

/** Props for {@link SuggestedAction}. */
export interface SuggestedActionProps {
  /** Suggestion from the server heuristics */
  suggestion: CookieTriageSuggestion;
}

/**
 * Maps confidence to a badge text-color utility.
 *
 * @param confidence - Suggestion confidence
 * @returns Tailwind text color class
 */
function confidenceClass(confidence: CookieTriageConfidence): string {
  if (confidence === 'high') return 'border-success text-success';
  if (confidence === 'medium') return 'border-warning text-warning';
  return 'border-line text-content-muted';
}

/**
 * Maps confidence to the badge label.
 *
 * @param confidence - Suggestion confidence
 * @returns Uppercase badge copy
 */
function confidenceLabel(confidence: CookieTriageConfidence): string {
  if (confidence === 'high') return 'HIGH CONFIDENCE';
  if (confidence === 'medium') return 'MEDIUM CONFIDENCE';
  return 'LOW CONFIDENCE';
}

/**
 * Suggested-action callout with confidence badge and reasoning.
 */
export function SuggestedAction({ suggestion }: SuggestedActionProps) {
  return (
    <div className="mb-5 rounded-md border border-line bg-surface-sunken px-4 py-3">
      <p className="mb-1.5 text-sm font-medium text-content-subtle uppercase">Suggested action</p>
      <span
        className={`mb-2 inline-block rounded-sm border px-2 py-0.5 text-sm font-medium ${confidenceClass(suggestion.confidence)}`}
      >
        {confidenceLabel(suggestion.confidence)}
      </span>
      <p className="text-sm text-content">{suggestion.reasoning}</p>
    </div>
  );
}
