import { describe, expect, it } from 'vitest';

import {
  ESSENTIAL_BLOCKS_OTHER_PURPOSES_TOOLTIP,
  OTHER_PURPOSE_BLOCKS_ESSENTIAL_TOOLTIP,
  isEssentialPurposeSlug,
  mergePurposeSelectOptions,
  orderSelectedPurposeSlugs,
  positionPurposeListbox,
  purposeOptionExclusiveDisabledReason,
  purposeSlugLabel,
} from '../src/ui/cookie-triage/PurposeMultiSelect.js';

describe('PurposeMultiSelect helpers', () => {
  const options = [
    { slug: 'Essential', label: 'Essential' },
    { slug: 'Analytics', label: 'Analytics' },
    { slug: 'CustomPurpose', label: 'Custom Purpose' },
  ];

  it('labels known and unknown purpose slugs', () => {
    expect(purposeSlugLabel('Analytics', options)).toBe('Analytics');
    expect(purposeSlugLabel('SaleOfInfo', options)).toBe('Sale of Personal Info');
    expect(purposeSlugLabel('Mystery', options)).toBe('Mystery');
  });

  it('prepends assigned slugs missing from the catalog', () => {
    expect(mergePurposeSelectOptions(options, ['Mystery', 'Analytics'])).toEqual([
      { slug: 'Mystery', label: 'Mystery' },
      ...options,
    ]);
  });

  it('never offers Unknown as a selectable option', () => {
    expect(
      mergePurposeSelectOptions(
        [...options, { slug: 'Unknown', label: 'Unknown' }],
        ['Unknown', 'Analytics'],
      ),
    ).toEqual(options);
  });

  it('orders selected slugs by the option list', () => {
    expect(orderSelectedPurposeSlugs(['CustomPurpose', 'Essential'], options)).toEqual([
      'Essential',
      'CustomPurpose',
    ]);
  });

  it('detects Essential purpose slugs case-insensitively', () => {
    expect(isEssentialPurposeSlug('Essential')).toBe(true);
    expect(isEssentialPurposeSlug('essential')).toBe(true);
    expect(isEssentialPurposeSlug('Analytics')).toBe(false);
  });

  it('disables other purposes when Essential is selected', () => {
    expect(purposeOptionExclusiveDisabledReason('Analytics', ['Essential'])).toBe(
      ESSENTIAL_BLOCKS_OTHER_PURPOSES_TOOLTIP,
    );
    expect(purposeOptionExclusiveDisabledReason('Essential', ['Essential'])).toBeUndefined();
  });

  it('disables Essential when another purpose is selected', () => {
    expect(purposeOptionExclusiveDisabledReason('Essential', ['Analytics'])).toBe(
      OTHER_PURPOSE_BLOCKS_ESSENTIAL_TOOLTIP,
    );
    expect(purposeOptionExclusiveDisabledReason('Functional', ['Analytics'])).toBeUndefined();
  });

  it('keeps already-selected conflicting purposes clearable', () => {
    expect(
      purposeOptionExclusiveDisabledReason('Analytics', ['Essential', 'Analytics']),
    ).toBeUndefined();
    expect(
      purposeOptionExclusiveDisabledReason('Essential', ['Essential', 'Analytics']),
    ).toBeUndefined();
    expect(purposeOptionExclusiveDisabledReason('Functional', ['Essential', 'Analytics'])).toBe(
      ESSENTIAL_BLOCKS_OTHER_PURPOSES_TOOLTIP,
    );
  });

  it('opens the listbox downward when there is enough room below', () => {
    expect(
      positionPurposeListbox(
        {
          top: 100,
          bottom: 140,
          left: 50,
          width: 200,
          height: 40,
          right: 250,
          x: 50,
          y: 100,
          toJSON: () => ({}),
        },
        { width: 800, height: 600 },
      ),
    ).toEqual({
      top: 144,
      left: 50,
      minWidth: 200,
      maxHeight: 224,
    });
  });

  it('opens the listbox upward and shrinks when space below is tight', () => {
    expect(
      positionPurposeListbox(
        {
          top: 520,
          bottom: 560,
          left: 50,
          width: 200,
          height: 40,
          right: 250,
          x: 50,
          y: 520,
          toJSON: () => ({}),
        },
        { width: 800, height: 600 },
      ),
    ).toEqual({
      bottom: 84,
      left: 50,
      minWidth: 200,
      maxHeight: 224,
    });
  });

  it('caps listbox height to the available viewport space', () => {
    expect(
      positionPurposeListbox(
        {
          top: 40,
          bottom: 80,
          left: 50,
          width: 200,
          height: 40,
          right: 250,
          x: 50,
          y: 40,
          toJSON: () => ({}),
        },
        { width: 800, height: 160 },
      ),
    ).toEqual({
      top: 84,
      left: 50,
      minWidth: 200,
      maxHeight: 68,
    });
  });
});
