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

describe('AssessmentsMixin (getAssessment answer shapes)', () => {
  const API_KEY_AUTH: AuthCredentials = { type: 'apiKey', apiKey: 'test-api-key-12345' };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  /** One form, one section, whatever questions a case needs. */
  function mockForm(questions: unknown[]) {
    return createMockFetchResponse({
      assessmentForms: {
        nodes: [
          {
            id: 'form-1',
            title: 'DPIA',
            description: '',
            status: 'IN_REVIEW',
            createdAt: '2026-01-01T00:00:00.000Z',
            assessmentGroup: { id: 'grp-1' },
            sections: [{ id: 'sec-1', title: 'Section 1', index: 0, status: null, questions }],
          },
        ],
      },
    });
  }

  it('returns a typed answer once, not once per field it appears in', async () => {
    // Free-text questions have no choice set: the API models the typed answer
    // as an option, so it would otherwise come back byte for byte twice.
    vi.stubGlobal(
      'fetch',
      mockForm([
        {
          id: 'q-1',
          title: 'Describe the project.',
          index: 0,
          type: 'LONG_ANSWER_TEXT',
          subType: 'NONE',
          description: '',
          isRequired: true,
          placeholder: '',
          answerOptions: [{ id: 'a-1', index: 0, value: 'A long paragraph.' }],
          selectedAnswers: [{ id: 'a-1', index: 0, value: 'A long paragraph.' }],
        },
      ]),
    );

    const client = new AssessmentsMixin(API_KEY_AUTH);
    const form = await client.getAssessment('form-1', { sectionIds: ['sec-1'] });
    const question = form.sections?.[0].questions?.[0];

    expect(question?.selectedAnswers?.map((a) => a.value)).toEqual(['A long paragraph.']);
    expect(question?.answerOptions).toBeUndefined();
  });

  it('keeps the choices a respondent passed over', async () => {
    vi.stubGlobal(
      'fetch',
      mockForm([
        {
          id: 'q-2',
          title: 'Which identifiers?',
          index: 0,
          type: 'MULTI_SELECT',
          subType: 'CUSTOM',
          description: '',
          isRequired: true,
          placeholder: '',
          answerOptions: [
            { id: 'a-1', index: 0, value: 'Email' },
            { id: 'a-2', index: 1, value: 'Mobile ID' },
          ],
          selectedAnswers: [{ id: 'a-2', index: 1, value: 'Mobile ID' }],
        },
      ]),
    );

    const client = new AssessmentsMixin(API_KEY_AUTH);
    const form = await client.getAssessment('form-1', { sectionIds: ['sec-1'] });
    const question = form.sections?.[0].questions?.[0];

    // What was not chosen is real information, unlike a duplicated paragraph.
    expect(question?.answerOptions?.map((a) => a.value)).toEqual(['Email', 'Mobile ID']);
  });
});
