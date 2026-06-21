import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_DASHBOARD_URL } from '../src/defaults.js';
import { resolveMcpDashboardUrl } from '../src/server/resolve-dashboard-url.js';

describe('resolveMcpDashboardUrl', () => {
  const originalDashboardUrl = process.env.TRANSCEND_DASHBOARD_URL;
  const originalVitest = process.env.VITEST;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    delete process.env.TRANSCEND_DASHBOARD_URL;
  });

  afterEach(() => {
    if (originalDashboardUrl === undefined) delete process.env.TRANSCEND_DASHBOARD_URL;
    else process.env.TRANSCEND_DASHBOARD_URL = originalDashboardUrl;

    if (originalVitest === undefined) delete process.env.VITEST;
    else process.env.VITEST = originalVitest;

    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  });

  it('uses TRANSCEND_DASHBOARD_URL when set in test env', () => {
    process.env.TRANSCEND_DASHBOARD_URL = 'https://yo.com:3000';

    expect(resolveMcpDashboardUrl()).toBe('https://yo.com:3000');
  });

  it('defaults to the production dashboard URL when unset in test env', () => {
    expect(resolveMcpDashboardUrl()).toBe(DEFAULT_DASHBOARD_URL);
  });

  it('ignores TRANSCEND_DASHBOARD_URL outside test env', () => {
    delete process.env.VITEST;
    process.env.NODE_ENV = 'production';
    process.env.TRANSCEND_DASHBOARD_URL = 'https://yo.com:3000';

    expect(resolveMcpDashboardUrl()).toBe(DEFAULT_DASHBOARD_URL);
  });
});
