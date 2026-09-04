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

describe('AssessmentsMixin (getAssessment section validation)', () => {
  const API_KEY_AUTH: AuthCredentials = { type: 'apiKey', apiKey: 'test-api-key-12345' };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function mockTwoSectionForm() {
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
            sections: [
              { id: 'sec-1', title: 'Data collected', index: 0, status: null, questions: [] },
              { id: 'sec-2', title: 'Retention', index: 1, status: null, questions: [] },
            ],
          },
        ],
      },
    });
  }

  it('fails when only some of the requested sections exist', async () => {
    vi.stubGlobal('fetch', mockTwoSectionForm());
    const client = new AssessmentsMixin(API_KEY_AUTH);

    // Returning just sec-1 would be a partial answer shaped like a complete
    // one, and the caller could not tell which of the two it got.
    await expect(client.getAssessment('form-1', { sectionIds: ['sec-1', 'typo'] })).rejects.toThrow(
      /no section with ID "typo"/,
    );
  });

  it('names the missing sections and the ones the form does have', async () => {
    vi.stubGlobal('fetch', mockTwoSectionForm());
    const client = new AssessmentsMixin(API_KEY_AUTH);

    const error = await client
      .getAssessment('form-1', { sectionIds: ['nope', 'sec-2'] })
      .then(() => undefined)
      .catch((e) => e as { details?: Record<string, unknown> });

    expect(error?.details?.missingSectionIds).toEqual(['nope']);
    expect(error?.details?.availableSections).toEqual([
      { id: 'sec-1', title: 'Data collected' },
      { id: 'sec-2', title: 'Retention' },
    ]);
  });

  it('expands the requested sections when every id is real', async () => {
    vi.stubGlobal('fetch', mockTwoSectionForm());
    const client = new AssessmentsMixin(API_KEY_AUTH);

    const form = await client.getAssessment('form-1', { sectionIds: ['sec-2'] });

    expect(form.sections?.map((s) => s.id)).toEqual(['sec-2']);
  });
});

describe('AssessmentsMixin (searchAssessmentQuestions)', () => {
  const API_KEY_AUTH: AuthCredentials = { type: 'apiKey', apiKey: 'test-api-key-12345' };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const SKELETON = {
    assessmentForms: {
      nodes: [
        {
          id: 'form-1',
          title: 'DPIA',
          status: 'IN_REVIEW',
          createdAt: '2026-01-01T00:00:00.000Z',
          sections: [
            { id: 'sec-1', title: 'Data collected', index: 0, questions: [{ id: 'q-1' }] },
            {
              id: 'sec-2',
              title: 'Retention',
              index: 1,
              questions: [{ id: 'q-2' }, { id: 'q-3' }],
            },
          ],
        },
      ],
    },
  };

  const question = (id: string) => ({
    id,
    title: `Question ${id}`,
    index: 0,
    type: 'LONG_ANSWER_TEXT',
    answerOptions: [],
    selectedAnswers: [],
  });

  /** Answers the skeleton request first, then each search page in turn. */
  function mockSearch(...pages: { nodes: unknown[]; totalCount: number }[]) {
    const payloads = [SKELETON, ...pages.map((p) => ({ assessmentQuestions: p }))];
    let call = 0;
    return vi.fn().mockImplementation(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => '',
      json: async () => ({ data: payloads[Math.min(call++, payloads.length - 1)] }),
    }));
  }

  it('names the section each match belongs to', async () => {
    vi.stubGlobal('fetch', mockSearch({ nodes: [question('q-3')], totalCount: 1 }));
    const client = new AssessmentsMixin(API_KEY_AUTH);

    const { matches, searchedCount } = await client.searchAssessmentQuestions(
      'form-1',
      'retention',
    );

    // A question carries no reference back to its section, so this mapping is
    // the only thing that places a match on the form.
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ id: 'q-3', sectionId: 'sec-2', sectionTitle: 'Retention' });
    expect(searchedCount).toBe(3);
  });

  it('scopes the search to the requested sections', async () => {
    const fetchMock = mockSearch({ nodes: [], totalCount: 0 });
    vi.stubGlobal('fetch', fetchMock);
    const client = new AssessmentsMixin(API_KEY_AUTH);

    const { searchedCount } = await client.searchAssessmentQuestions('form-1', 'retention', {
      sectionIds: ['sec-1'],
    });

    const body = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(body.variables.filterBy).toEqual({ text: 'retention', assessmentSectionIds: ['sec-1'] });
    // Only the searched section counts toward "N of M questions".
    expect(searchedCount).toBe(1);
  });

  it('rejects a section the form does not have', async () => {
    vi.stubGlobal('fetch', mockSearch({ nodes: [], totalCount: 0 }));
    const client = new AssessmentsMixin(API_KEY_AUTH);

    await expect(
      client.searchAssessmentQuestions('form-1', 'retention', { sectionIds: ['typo'] }),
    ).rejects.toThrow(/no section with ID "typo"/);
  });

  it('drains every page of matches, and keeps paging past rows it drops', async () => {
    // A full page of questions this form does not have, then the one it does.
    const strangers = Array.from({ length: 100 }, (_, i) => question(`other-${i}`));
    const fetchMock = mockSearch(
      { nodes: strangers, totalCount: 101 },
      { nodes: [question('q-2')], totalCount: 101 },
    );
    vi.stubGlobal('fetch', fetchMock);
    const client = new AssessmentsMixin(API_KEY_AUTH);

    const { matches } = await client.searchAssessmentQuestions('form-1', 'q');

    // Offsetting by matches held rather than rows read would re-request page
    // one forever, since this page contributes nothing to keep.
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(matches.map((m) => m.id)).toEqual(['q-2']);
  });
});
