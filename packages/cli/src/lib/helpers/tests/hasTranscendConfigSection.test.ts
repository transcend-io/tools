import { DefaultConsentOption, ScopeName } from '@transcend-io/privacy-types';
import { describe, expect, it } from 'vitest';

import {
  derivePushScopesFromTranscendInput,
  hasTranscendConfigSection,
  stripEmptyTranscendConfigSections,
} from '../hasTranscendConfigSection.js';

describe('hasTranscendConfigSection', () => {
  it('returns false for empty arrays and empty objects', () => {
    expect(hasTranscendConfigSection([])).toBe(false);
    expect(hasTranscendConfigSection({})).toBe(false);
    expect(hasTranscendConfigSection(undefined)).toBe(false);
    expect(hasTranscendConfigSection(null)).toBe(false);
  });

  it('returns true for non-empty arrays and objects', () => {
    expect(hasTranscendConfigSection([{ title: 'CCTV' }])).toBe(true);
    expect(hasTranscendConfigSection({ unknownRequestPolicy: 'ALLOW' })).toBe(true);
  });
});

describe('stripEmptyTranscendConfigSections', () => {
  it('removes empty top-level sections', () => {
    expect(
      stripEmptyTranscendConfigSections({
        purposes: [{ title: 'Advertising' }],
        'processing-activities': [],
        'action-items': [],
      }),
    ).toEqual({
      purposes: [{ title: 'Advertising' }],
    });
  });
});

describe('derivePushScopesFromTranscendInput', () => {
  it('does not request ManageDataMap for empty processing-activities arrays', () => {
    const scopes = derivePushScopesFromTranscendInput({
      'processing-activities': [],
      purposes: [
        {
          trackingType: 'Advertising',
          title: 'Advertising',
          name: 'Advertising',
          'default-consent': DefaultConsentOption.OptOut,
        },
      ],
    });

    expect(scopes).not.toContain(ScopeName.ManageDataMap);
    expect(scopes).toContain(ScopeName.ManageConsentManager);
  });

  it('requests ManageDataMap when processing-activities has entries', () => {
    const scopes = derivePushScopesFromTranscendInput({
      'processing-activities': [{ title: 'CCTV — Disney Italia Theme Park Entrances' }],
    });

    expect(scopes).toContain(ScopeName.ManageDataMap);
  });
});
