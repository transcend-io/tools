import type { GraphQLClient } from 'graphql-request';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../api/makeGraphQLRequest.js', () => ({
  makeGraphQLRequest: vi.fn(async () => ({})),
}));

vi.mock('../fetchAllPurposes.js', () => ({
  fetchAllPurposes: vi.fn(async () => []),
}));

import { makeGraphQLRequest } from '../../api/makeGraphQLRequest.js';
import { syncPurposes } from '../syncPurposes.js';

const client = {} as GraphQLClient;

/** Logger that records messages so tests can assert on them */
function buildLogger() {
  return { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
}

describe('syncPurposes default-consent', () => {
  beforeEach(() => {
    vi.mocked(makeGraphQLRequest).mockReset();
    vi.mocked(makeGraphQLRequest).mockResolvedValue({
      createPurpose: { purpose: { id: 'purpose-1', trackingType: 'Example' } },
    });
  });

  it('warns once when purposes set default-consent', async () => {
    const logger = buildLogger();

    await syncPurposes(
      client,
      [
        { trackingType: 'Example', title: 'Example', name: 'Example', 'default-consent': 'off' },
        { trackingType: 'Other', title: 'Other', name: 'Other', 'default-consent': 'Auto' },
      ],
      { logger },
    );

    expect(logger.warn).toHaveBeenCalledTimes(1);
    const message = logger.warn.mock.calls[0]![0] as string;
    expect(message).toContain('default-consent');
    expect(message).toContain('Example, Other');
    expect(message).toContain('optedOutPurposes');
    expect(message).toContain('consent-manager.experiences');
  });

  it('does not warn when default-consent is not set', async () => {
    const logger = buildLogger();

    await syncPurposes(client, [{ trackingType: 'Example', title: 'Example', name: 'Example' }], {
      logger,
    });

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('does not send default-consent to the API', async () => {
    await syncPurposes(
      client,
      [{ trackingType: 'Example', title: 'Example', name: 'Example', 'default-consent': 'off' }],
      { logger: buildLogger() },
    );

    const sent = JSON.stringify(vi.mocked(makeGraphQLRequest).mock.calls);
    expect(sent).not.toContain('default-consent');
    expect(sent).not.toContain('defaultConsent');
  });
});
