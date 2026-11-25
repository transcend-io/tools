import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_DASHBOARD_URL } from '../src/defaults.js';
import { ALLOW_TEST_OVERRIDES_ENV } from '../src/oauth/env.js';
import { resolveMcpDashboardUrl } from '../src/server/resolve-dashboard-url.js';

describe('resolveMcpDashboardUrl', () => {
  const originalDashboardUrl = process.env.TRANSCEND_DASHBOARD_URL;
  const originalAllowTestOverrides = process.env[ALLOW_TEST_OVERRIDES_ENV];

  beforeEach(() => {
    delete process.env.TRANSCEND_DASHBOARD_URL;
    process.env[ALLOW_TEST_OVERRIDES_ENV] = '1';
  });

  afterEach(() => {
    if (originalDashboardUrl === undefined) delete process.env.TRANSCEND_DASHBOARD_URL;
    else process.env.TRANSCEND_DASHBOARD_URL = originalDashboardUrl;

    if (originalAllowTestOverrides === undefined) delete process.env[ALLOW_TEST_OVERRIDES_ENV];
    else process.env[ALLOW_TEST_OVERRIDES_ENV] = originalAllowTestOverrides;
  });

  it('uses TRANSCEND_DASHBOARD_URL when ALLOW_TEST_OVERRIDES=1', () => {
    process.env.TRANSCEND_DASHBOARD_URL = 'https://yo.com:3000';

    expect(resolveMcpDashboardUrl()).toBe('https://yo.com:3000');
  });

  it('defaults to the production dashboard URL when unset with overrides enabled', () => {
    expect(resolveMcpDashboardUrl()).toBe(DEFAULT_DASHBOARD_URL);
  });

  it('ignores TRANSCEND_DASHBOARD_URL when ALLOW_TEST_OVERRIDES is unset', () => {
    delete process.env[ALLOW_TEST_OVERRIDES_ENV];
    process.env.TRANSCEND_DASHBOARD_URL = 'https://yo.com:3000';

    expect(resolveMcpDashboardUrl()).toBe(DEFAULT_DASHBOARD_URL);
  });

  it('ignores TRANSCEND_DASHBOARD_URL when ALLOW_TEST_OVERRIDES is not 1', () => {
    process.env[ALLOW_TEST_OVERRIDES_ENV] = '0';
    process.env.TRANSCEND_DASHBOARD_URL = 'https://yo.com:3000';

    expect(resolveMcpDashboardUrl()).toBe(DEFAULT_DASHBOARD_URL);
  });
});
