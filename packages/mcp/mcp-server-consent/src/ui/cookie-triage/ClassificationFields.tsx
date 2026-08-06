import type { CookieTriageDraft, CookieTriageOptions } from './types.js';

/** Props for {@link ClassificationFields}. */
export interface ClassificationFieldsProps {
  /** Available purpose / service choices */
  options: CookieTriageOptions;
  /** Local draft classification */
  draft: CookieTriageDraft;
  /** Whether controls are locked during an act call */
  disabled: boolean;
  /** Update the draft when the user changes a field */
  onChange: (draft: CookieTriageDraft) => void;
}

/**
 * Purpose select and service datalist for classifying the current item.
 */
export function ClassificationFields({
  options,
  draft,
  disabled,
  onChange,
}: ClassificationFieldsProps) {
  const purposeFilled = draft.purposeSlug !== '';
  const serviceFilled = draft.service.trim() !== '';

  return (
    <div className="mb-5 grid grid-cols-2 gap-3">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-content-subtle uppercase">
          Purpose
        </span>
        <select
          className={[
            'w-full rounded-sm border bg-surface px-2.5 py-2 text-sm text-content',
            purposeFilled ? 'border-success' : 'border-line',
          ].join(' ')}
          value={draft.purposeSlug}
          disabled={disabled}
          onChange={(event) => {
            const purposeSlug = event.target.value;
            const match = options.purposes.find((purpose) => purpose.value === purposeSlug);
            onChange({
              ...draft,
              purposeSlug,
              purposeId: match?.id ?? '',
            });
          }}
        >
          <option value="">Select purpose…</option>
          {options.purposes.map((purpose) => (
            <option key={purpose.id} value={purpose.value}>
              {purpose.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-content-subtle uppercase">
          Service
        </span>
        <input
          className={[
            'w-full rounded-sm border bg-surface px-2.5 py-2 text-sm text-content',
            serviceFilled ? 'border-success' : 'border-line',
          ].join(' ')}
          list="cookie-triage-services"
          value={draft.service}
          disabled={disabled}
          placeholder="Service name"
          onChange={(event) => onChange({ ...draft, service: event.target.value })}
        />
        <datalist id="cookie-triage-services">
          {options.services.map((service) => (
            <option key={service} value={service} />
          ))}
        </datalist>
      </label>
    </div>
  );
}
