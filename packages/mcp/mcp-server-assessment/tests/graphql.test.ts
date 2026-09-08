import type { AuthCredentials } from '@transcend-io/mcp-server-base';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { AssessmentsMixin } from '../src/graphql.js';

function createMockFetchResponse<T>(data: T) {
  return vi.fn().mockImplementation(async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    text: async () => '',
    json: async () => ({ data }),
  }));
}

describe('AssessmentsMixin (normalizeQuestion / generateUUID)', () => {
  const API_KEY_AUTH: AuthCredentials = { type: 'apiKey', apiKey: 'test-api-key-12345' };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('generates UUID for question with missing referenceId', async () => {
    const mockFetch = createMockFetchResponse({
      createAssessmentFormTemplate: {
        assessmentFormTemplate: {
          id: 'tpl-1',
          title: 'Template',
          status: 'DRAFT',
          sections: [],
        },
      },
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new AssessmentsMixin(API_KEY_AUTH);
    await client.createAssessmentFormTemplate({
      title: 'Test Template',
      sections: [
        {
          title: 'Section 1',
          questions: [
            {
              title: 'Question without referenceId',
              type: 'SHORT_ANSWER_TEXT',
            },
          ],
        },
      ],
    });

    const callBody = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    const questions = callBody.variables.input.sections[0].questions;
    expect(questions).toHaveLength(1);
    expect(questions[0].referenceId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('sets subType to CUSTOM when allowSelectOther is true', async () => {
    const mockFetch = createMockFetchResponse({
      createAssessmentFormTemplate: {
        assessmentFormTemplate: {
          id: 'tpl-1',
          title: 'Template',
          status: 'DRAFT',
          sections: [],
        },
      },
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new AssessmentsMixin(API_KEY_AUTH);
    await client.createAssessmentFormTemplate({
      title: 'Test Template',
      sections: [
        {
          title: 'Section 1',
          questions: [
            {
              title: 'Select question',
              type: 'SINGLE_SELECT',
              subType: 'NONE',
              allowSelectOther: true,
              referenceId: 'e7cfe5ad-3568-4c74-af3d-fd6afce5740a',
            },
          ],
        },
      ],
    });

    const callBody = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    const questions = callBody.variables.input.sections[0].questions;
    expect(questions[0].subType).toBe('CUSTOM');
    expect(questions[0].allowSelectOther).toBe(true);
  });

  it('strips requireRiskEvaluation when riskFrameworkId is missing', async () => {
    const mockFetch = createMockFetchResponse({
      createAssessmentFormTemplate: {
        assessmentFormTemplate: {
          id: 'tpl-1',
          title: 'Template',
          status: 'DRAFT',
          sections: [],
        },
      },
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new AssessmentsMixin(API_KEY_AUTH);
    await client.createAssessmentFormTemplate({
      title: 'Test Template',
      sections: [
        {
          title: 'Section 1',
          questions: [
            {
              title: 'Risk question',
              type: 'SINGLE_SELECT',
              referenceId: 'e7cfe5ad-3568-4c74-af3d-fd6afce5740a',
              requireRiskEvaluation: true,
            },
          ],
        },
      ],
    });

    const callBody = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    const questions = callBody.variables.input.sections[0].questions;
    expect(questions[0].requireRiskEvaluation).toBe(false);
  });
});

describe('AssessmentsMixin (row shapes that callers audit against)', () => {
  const API_KEY_AUTH: AuthCredentials = { type: 'apiKey', apiKey: 'test-api-key-12345' };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('reports a missing due date as null rather than dropping the key', async () => {
    // An absent key reads as "the query never asked for this", which makes the
    // dueBefore filter look broken instead of showing a form with no deadline.
    vi.stubGlobal(
      'fetch',
      createMockFetchResponse({
        assessmentForms: {
          nodes: [
            {
              id: 'form-1',
              title: 'Untimed review',
              status: 'IN_PROGRESS',
              createdAt: '2026-01-01T00:00:00.000Z',
              dueDate: null,
              updatedAt: '2026-01-02T00:00:00.000Z',
              submittedAt: null,
              isArchived: false,
              isLocked: false,
              assignees: [],
              reviewers: [],
              externalAssignees: [],
            },
          ],
          totalCount: 1,
        },
      }),
    );

    const client = new AssessmentsMixin(API_KEY_AUTH);
    const result = await client.listAssessments({ includeDetails: true });

    expect(result.nodes[0]).toHaveProperty('dueDate');
    expect(result.nodes[0].dueDate).toBeNull();
  });
});
