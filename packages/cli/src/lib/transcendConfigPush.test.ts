import { ScopeName } from '@transcend-io/privacy-types';
import { describe, expect, it } from 'vitest';

import {
  derivePushScopesFromTranscendInput,
  hasTranscendConfigSection,
  stripEmptyTranscendConfigSections,
  summarizeTranscendConfigSections,
} from './transcendConfigPush.js';

describe('transcendConfigPush', () => {
  it('hasTranscendConfigSection treats empty collections as absent', () => {
    expect(hasTranscendConfigSection(undefined)).toBe(false);
    expect(hasTranscendConfigSection(null)).toBe(false);
    expect(hasTranscendConfigSection([])).toBe(false);
    expect(hasTranscendConfigSection({})).toBe(false);
    expect(hasTranscendConfigSection([{ name: 'a' }])).toBe(true);
    expect(hasTranscendConfigSection({ foo: 'bar' })).toBe(true);
  });

  it('stripEmptyTranscendConfigSections removes empty sections', () => {
    expect(
      stripEmptyTranscendConfigSections({
        purposes: [],
        templates: [{ title: 'Welcome' }],
        'action-items': {},
      }),
    ).toEqual({
      templates: [{ title: 'Welcome' }],
    });
  });

  it('derivePushScopesFromTranscendInput ignores empty sections', () => {
    const scopes = derivePushScopesFromTranscendInput({
      'action-items': [],
      purposes: [{ trackingType: 'Analytics', title: 'Analytics', name: 'Analytics' }],
    });
    expect(scopes).toContain(ScopeName.ManageConsentManager);
    expect(scopes).not.toContain(ScopeName.ManageAllActionItems);
  });

  it('summarizeTranscendConfigSections lists present sections', () => {
    expect(
      summarizeTranscendConfigSections({
        purposes: [{ trackingType: 'Analytics', title: 'Analytics', name: 'Analytics' }],
        templates: [{ title: 'A' }, { title: 'B' }],
      }),
    ).toBe('purposes: (1), templates: (2)');
  });
});
