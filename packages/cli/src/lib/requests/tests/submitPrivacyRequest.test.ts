import { RequestAction, RequestStatus } from '@transcend-io/privacy-types';
import type { Got } from 'got';
import { describe, expect, it, vi } from 'vitest';

import { submitPrivacyRequest } from '../submitPrivacyRequest.js';

const successfulResponse = {
  request: {
    id: 'req-1',
    link: 'https://app.transcend.io/privacy-requests/incoming-requests/req-1',
    status: RequestStatus.RequestMade,
    type: RequestAction.Access,
    subjectType: 'customer',
    email: 'user@example.com',
    coreIdentifier: 'id-123',
    isSilent: true,
    isTest: false,
    country: null,
    countrySubDivision: null,
    attributeValues: [],
  },
};

const baseInput = {
  email: 'user@example.com',
  coreIdentifier: 'id-123',
  requestType: RequestAction.Access,
  subjectType: 'customer',
  attestedExtraIdentifiers: {},
};

describe('submitPrivacyRequest workflowConfigId', () => {
  it('includes workflowConfigId in the POST body when present on the input', async () => {
    const workflowConfigId = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
    const post = vi.fn().mockReturnValue({
      json: vi.fn().mockResolvedValue(successfulResponse),
    });
    const sombra = { post } as unknown as Got;

    await submitPrivacyRequest(sombra, { ...baseInput, workflowConfigId });

    expect(post.mock.calls[0]![1].json.workflowConfigId).to.equal(workflowConfigId);
  });

  it('omits workflowConfigId from the POST body when absent on the input', async () => {
    const post = vi.fn().mockReturnValue({
      json: vi.fn().mockResolvedValue(successfulResponse),
    });
    const sombra = { post } as unknown as Got;

    await submitPrivacyRequest(sombra, baseInput);

    expect(post.mock.calls[0]![1].json).to.not.have.property('workflowConfigId');
  });
});
