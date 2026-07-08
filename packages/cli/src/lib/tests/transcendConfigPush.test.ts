import { ScopeName } from '@transcend-io/privacy-types';
import { describe, expect, it } from 'vitest';

import type { TranscendInput } from '../../codecs.js';
import {
  derivePushScopesFromTranscendInput,
  hasTranscendConfigSection,
  stripEmptyTranscendConfigSections,
  summarizeTranscendConfigSections,
} from '../transcendConfigPush.js';

describe('transcendConfigPush', () => {
  it('hasTranscendConfigSection treats empty arrays and objects as absent', () => {
    expect(hasTranscendConfigSection([])).toBe(false);
    expect(hasTranscendConfigSection({})).toBe(false);
    expect(hasTranscendConfigSection(undefined)).toBe(false);
    expect(hasTranscendConfigSection([{ title: 'x' }])).toBe(true);
    expect(hasTranscendConfigSection({ foo: 'bar' })).toBe(true);
  });

  it('stripEmptyTranscendConfigSections removes empty sections', () => {
    expect(
      stripEmptyTranscendConfigSections({
        'action-items': [],
        purposes: [{ title: 'Ads', name: 'Ads', trackingType: 'Ads' }],
        'consent-manager': {},
      }),
    ).toEqual({
      purposes: [{ title: 'Ads', name: 'Ads', trackingType: 'Ads' }],
    });
  });

  it('derivePushScopesFromTranscendInput excludes action-item scopes for empty action-items', () => {
    const scopes = derivePushScopesFromTranscendInput({
      'action-items': [],
      purposes: [{ title: 'Ads', name: 'Ads', trackingType: 'Ads' }],
    } as TranscendInput);

    expect(scopes).toContain(ScopeName.ManageConsentManager);
    expect(scopes).not.toContain(ScopeName.ManageAllActionItems);
  });

  it('summarizeTranscendConfigSections lists present sections', () => {
    expect(
      summarizeTranscendConfigSections({
        purposes: [{ title: 'Ads', name: 'Ads', trackingType: 'Ads' }],
        templates: [{ title: 'A' }, { title: 'B' }],
      } as TranscendInput),
    ).toBe('purposes: (1), templates: (2)');
  });
});
