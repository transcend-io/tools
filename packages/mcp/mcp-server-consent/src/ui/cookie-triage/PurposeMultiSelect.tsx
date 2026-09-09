import { CheckboxMultiSelect, type CheckboxMultiSelectOption } from '@transcend-io/mcp-ui-common';
import { memo, useCallback, useMemo } from 'react';

import type { CookieTriagePurposeOption } from '../../lib/cookieTriageTypes.ts';
import {
  COOKIE_TRIAGE_PURPOSE_LABELS,
  isUnknownCookiePurposeSlug,
  type CookieTriagePurposeCategory,
} from '../../lib/resolvePrimaryCookiePurpose.ts';
import { purposeBadgeClass } from './purposeBadgeClasses.ts';

/** Built-in Essential purpose slug (case-insensitive match). */
const ESSENTIAL_PURPOSE_SLUG = 'Essential';

/** Tooltip when Essential is selected and another purpose cannot be chosen. */
export const ESSENTIAL_BLOCKS_OTHER_PURPOSES_TOOLTIP =
  'Essential cannot be combined with other purposes. Clear Essential first.';

/** Tooltip when a non-Essential purpose is selected and Essential cannot be chosen. */
export const OTHER_PURPOSE_BLOCKS_ESSENTIAL_TOOLTIP =
  'Essential cannot be combined with other purposes. Clear the other purposes first.';

interface PurposeMultiSelectProps {
  /** Accessible name prefix (usually the cookie / data-flow name) */
  itemName: string;
  /** Currently assigned purpose slugs */
  selected: readonly string[];
  /** Org purpose options from `consent_list_purposes` */
  options: readonly CookieTriagePurposeOption[];
  /** Whether mutations are in flight for this row */
  disabled?: boolean;
  /** Persist the next purpose list */
  onChange: (trackingPurposes: string[]) => void | Promise<void>;
}

/** Whether a tracking-purpose slug is Essential. */
export function isEssentialPurposeSlug(slug: string): boolean {
  return slug.toLowerCase() === ESSENTIAL_PURPOSE_SLUG.toLowerCase();
}

/**
 * Why a purpose option is locked by Essential exclusivity, or `undefined` if selectable.
 *
 * Already-selected options stay unlocked so they can be cleared.
 */
export function purposeOptionExclusiveDisabledReason(
  slug: string,
  selected: readonly string[],
): string | undefined {
  const checked = selected.some((candidate) => candidate === slug);
  if (checked) {
    return undefined;
  }

  const hasEssential = selected.some(isEssentialPurposeSlug);
  const hasNonEssential = selected.some((candidate) => !isEssentialPurposeSlug(candidate));

  if (isEssentialPurposeSlug(slug)) {
    return hasNonEssential ? OTHER_PURPOSE_BLOCKS_ESSENTIAL_TOOLTIP : undefined;
  }
  return hasEssential ? ESSENTIAL_BLOCKS_OTHER_PURPOSES_TOOLTIP : undefined;
}

/** Resolve a display label for a purpose slug. */
export function purposeSlugLabel(
  slug: string,
  options: readonly CookieTriagePurposeOption[],
): string {
  const fromOptions = options.find((option) => option.slug === slug)?.label;
  if (fromOptions) {
    return fromOptions;
  }
  return COOKIE_TRIAGE_PURPOSE_LABELS[slug as CookieTriagePurposeCategory] ?? slug;
}

/**
 * Merge org options with any assigned slugs missing from the catalog so the
 * multi-select can still show and toggle them.
 *
 * Unknown is never offered as a selectable option.
 */
export function mergePurposeSelectOptions(
  options: readonly CookieTriagePurposeOption[],
  selected: readonly string[],
): CookieTriagePurposeOption[] {
  const catalog = options.filter((option) => !isUnknownCookiePurposeSlug(option.slug));
  const known = new Set(catalog.map((option) => option.slug));
  const extras = selected
    .filter((slug) => slug.length > 0 && !isUnknownCookiePurposeSlug(slug) && !known.has(slug))
    .map((slug) => ({ slug, label: purposeSlugLabel(slug, catalog) }));
  return extras.length === 0 ? [...catalog] : [...extras, ...catalog];
}

/**
 * Order selected purpose slugs by the option list order (unknowns keep their relative order).
 */
export function orderSelectedPurposeSlugs(
  selected: readonly string[],
  options: readonly CookieTriagePurposeOption[],
): string[] {
  const selectedSet = new Set(selected);
  const ordered: string[] = [];
  for (const option of options) {
    if (selectedSet.has(option.slug)) {
      ordered.push(option.slug);
      selectedSet.delete(option.slug);
    }
  }
  for (const slug of selected) {
    if (selectedSet.has(slug)) {
      ordered.push(slug);
      selectedSet.delete(slug);
    }
  }
  return ordered;
}

/** Checkbox dropdown for assigning one or more tracking purposes. */
export const PurposeMultiSelect = memo(function PurposeMultiSelect({
  itemName,
  selected,
  options,
  disabled = false,
  onChange,
}: PurposeMultiSelectProps) {
  const selectOptions = useMemo(
    () => mergePurposeSelectOptions(options, selected),
    [options, selected],
  );
  const orderedSelected = useMemo(
    () => orderSelectedPurposeSlugs(selected, selectOptions),
    [selected, selectOptions],
  );

  const listOptions = useMemo<CheckboxMultiSelectOption[]>(
    () =>
      selectOptions.map((option) => {
        const exclusiveDisabledReason = purposeOptionExclusiveDisabledReason(
          option.slug,
          orderedSelected,
        );
        return {
          id: option.slug,
          label: option.label,
          ...(exclusiveDisabledReason
            ? { disabled: true, disabledReason: exclusiveDisabledReason }
            : {}),
        };
      }),
    [orderedSelected, selectOptions],
  );

  const handleChange = useCallback(
    (ids: string[]) => onChange(orderSelectedPurposeSlugs(ids, selectOptions)),
    [onChange, selectOptions],
  );

  const renderValue = useCallback(
    (selectedIds: readonly string[]) => {
      if (selectedIds.length === 0) {
        return (
          <span className="inline-flex h-6 items-center rounded-sm bg-fill-neutral px-1.5 text-sm text-on-card-muted">
            Select
          </span>
        );
      }
      return selectedIds.map((slug) => (
        <span
          key={slug}
          className={`inline-flex h-6 max-w-full items-center truncate rounded-sm px-1.5 text-sm text-on-fill ${purposeBadgeClass(slug)}`}
        >
          {purposeSlugLabel(slug, selectOptions)}
        </span>
      ));
    },
    [selectOptions],
  );

  return (
    <CheckboxMultiSelect
      ariaLabel={`Tracking purposes for ${itemName}`}
      listboxLabel={`Choose tracking purposes for ${itemName}`}
      selected={orderedSelected}
      options={listOptions}
      disabled={disabled}
      onChange={handleChange}
      renderValue={renderValue}
    />
  );
});
