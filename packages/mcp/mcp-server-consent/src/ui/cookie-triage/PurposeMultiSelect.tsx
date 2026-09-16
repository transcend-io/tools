import { CheckboxMultiSelect, type CheckboxMultiSelectOption } from '@transcend-io/mcp-ui-common';
import { memo, useCallback, useMemo } from 'react';

import {
  CookieTriageDefaultPurpose,
  isUnknownCookiePurposeSlug,
} from '../../lib/resolvePrimaryCookiePurpose.ts';
import { purposeBadgeClass } from './purposeBadgeClasses.ts';

/** Built-in Essential purpose slug (case-insensitive match). */
const ESSENTIAL_PURPOSE_SLUG = CookieTriageDefaultPurpose.Essential;

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
  /** Org purpose slugs from `consent_list_purposes` */
  options: readonly string[];
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

/**
 * Merge org purpose slugs with any assigned slugs missing from the catalog so the
 * multi-select can still show and toggle them.
 *
 * Unknown is never offered as a selectable option.
 */
export function mergePurposeSelectOptions(
  options: readonly string[],
  selected: readonly string[],
): string[] {
  const catalog = options.filter((slug) => !isUnknownCookiePurposeSlug(slug));
  const known = new Set(catalog);
  const extras = selected.filter(
    (slug) => slug.length > 0 && !isUnknownCookiePurposeSlug(slug) && !known.has(slug),
  );
  return extras.length === 0 ? [...catalog] : [...extras, ...catalog];
}

/**
 * Order selected purpose slugs by the option list order (unknowns keep their relative order).
 */
export function orderSelectedPurposeSlugs(
  selected: readonly string[],
  options: readonly string[],
): string[] {
  const selectedSet = new Set(selected);
  const ordered: string[] = [];
  for (const slug of options) {
    if (selectedSet.has(slug)) {
      ordered.push(slug);
      selectedSet.delete(slug);
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
      selectOptions.map((slug) => {
        const exclusiveDisabledReason = purposeOptionExclusiveDisabledReason(slug, orderedSelected);
        return {
          id: slug,
          label: slug,
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

  const renderValue = useCallback((selectedIds: readonly string[]) => {
    if (selectedIds.length === 0) {
      return (
        <span className="inline-flex h-6 items-center rounded-sm border border-card-line bg-card px-1.5 text-sm text-on-card-muted">
          Select
        </span>
      );
    }
    return selectedIds.map((slug) => (
      <span
        key={slug}
        title={slug}
        className={`inline-flex h-6 min-w-0 max-w-full items-center truncate rounded-sm px-1.5 text-sm ${purposeBadgeClass(slug)}`}
      >
        {slug}
      </span>
    ));
  }, []);

  const renderOption = useCallback(
    (option: CheckboxMultiSelectOption) => (
      <span
        title={option.id}
        className={`inline-flex h-6 min-w-0 max-w-full items-center truncate rounded-sm px-1.5 text-sm ${purposeBadgeClass(option.id)}`}
      >
        {option.id}
      </span>
    ),
    [],
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
      renderOption={renderOption}
    />
  );
});
