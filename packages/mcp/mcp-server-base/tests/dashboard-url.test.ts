import { describe, it, expect } from 'vitest';

import {
  DEFAULT_DASHBOARD_URL,
  TRANSCEND_DASHBOARD_URL_ENV,
  resolveDashboardUrl,
} from '../src/dashboard-url.js';

describe('DEFAULT_DASHBOARD_URL', () => {
  it('points at the canonical Transcend admin dashboard host', () => {
    // All Transcend orgs share `app.transcend.io` regardless of region; the
    // regional split lives on the API host. If this changes, also update the
    // assessment deep-link tools and `composeAssessmentLink` upstream.
    expect(DEFAULT_DASHBOARD_URL).toBe('https://app.transcend.io');
  });
});

describe('resolveDashboardUrl', () => {
  it('falls back to DEFAULT_DASHBOARD_URL when the env var is unset', () => {
    expect(resolveDashboardUrl({})).toBe(DEFAULT_DASHBOARD_URL);
  });

  it('honors the TRANSCEND_DASHBOARD_URL env var when set', () => {
    expect(
      resolveDashboardUrl({ [TRANSCEND_DASHBOARD_URL_ENV]: 'https://app.staging.transcend.io' }),
    ).toBe('https://app.staging.transcend.io');
  });

  it('trims a trailing slash from the override', () => {
    expect(
      resolveDashboardUrl({ [TRANSCEND_DASHBOARD_URL_ENV]: 'https://app.staging.transcend.io/' }),
    ).toBe('https://app.staging.transcend.io');
  });

  it('trims surrounding whitespace and treats empty / whitespace-only as unset', () => {
    expect(
      resolveDashboardUrl({
        [TRANSCEND_DASHBOARD_URL_ENV]: '  https://app.staging.transcend.io  ',
      }),
    ).toBe('https://app.staging.transcend.io');
    expect(resolveDashboardUrl({ [TRANSCEND_DASHBOARD_URL_ENV]: '' })).toBe(DEFAULT_DASHBOARD_URL);
    expect(resolveDashboardUrl({ [TRANSCEND_DASHBOARD_URL_ENV]: '   ' })).toBe(
      DEFAULT_DASHBOARD_URL,
    );
  });

  it('supports localhost overrides for local dashboard development', () => {
    expect(resolveDashboardUrl({ [TRANSCEND_DASHBOARD_URL_ENV]: 'http://localhost:3000' })).toBe(
      'http://localhost:3000',
    );
  });
});
