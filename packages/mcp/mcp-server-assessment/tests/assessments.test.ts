import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getAssessmentTools } from '../src/tools.js';

describe('Assessment Tools', () => {
  let mockGraphql: {
    listAssessments: ReturnType<typeof vi.fn>;
    listAssessmentGroups: ReturnType<typeof vi.fn>;
    createAssessment: ReturnType<typeof vi.fn>;
    getAssessment: ReturnType<typeof vi.fn>;
    getAssessmentSkeleton: ReturnType<typeof vi.fn>;
    searchAssessmentQuestions: ReturnType<typeof vi.fn>;
    listAssessmentFormComments: ReturnType<typeof vi.fn>;
    listAssessmentSectionComments: ReturnType<typeof vi.fn>;
    listAssessmentQuestionComments: ReturnType<typeof vi.fn>;
    countAssessmentComments: ReturnType<typeof vi.fn>;
    createAssessmentFormTemplate: ReturnType<typeof vi.fn>;
    selectAssessmentQuestionAnswers: ReturnType<typeof vi.fn>;
    updateAssessmentFormAssignees: ReturnType<typeof vi.fn>;
    updateAssessment: ReturnType<typeof vi.fn>;
    submitAssessmentForReview: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockGraphql = {
      listAssessments: vi.fn(),
      listAssessmentGroups: vi.fn(),
      createAssessment: vi.fn(),
      getAssessment: vi.fn(),
      getAssessmentSkeleton: vi.fn(),
      searchAssessmentQuestions: vi.fn(),
      listAssessmentFormComments: vi.fn().mockResolvedValue({ nodes: [], totalCount: 0 }),
      listAssessmentSectionComments: vi.fn().mockResolvedValue({ nodes: [], totalCount: 0 }),
      listAssessmentQuestionComments: vi.fn().mockResolvedValue({
        nodes: [],
        questionTitles: {},
        questionSections: {},
        sectionTitles: {},
        sectionIds: ['sec-1', 'sec-2'],
      }),
      countAssessmentComments: vi.fn().mockResolvedValue({ FORM: 0, SECTION: 0, QUESTION: 0 }),
      createAssessmentFormTemplate: vi.fn(),
      selectAssessmentQuestionAnswers: vi.fn(),
      updateAssessmentFormAssignees: vi.fn(),
      updateAssessment: vi.fn(),
      submitAssessmentForReview: vi.fn(),
    };
  });

  const getTools = (dashboardUrl = 'https://app.transcend.io') =>
    getAssessmentTools({
      rest: {} as never,
      graphql: mockGraphql as never,
      dashboardUrl,
    });

  describe('assessments_get', () => {
    const getTool = () => getTools().find((t) => t.name === 'assessments_get')!;

    const SKELETON = {
      id: 'form-1',
      title: 'DPIA for Rideshare App',
      status: 'IN_REVIEW',
      sections: [
        { id: 'sec-1', title: 'Data collected', index: 0, questionCount: 12 },
        { id: 'sec-2', title: 'Retention', index: 1, questionCount: 8 },
      ],
    };

    const EXPANDED = {
      id: 'form-1',
      title: 'DPIA for Rideshare App',
      status: 'IN_REVIEW',
      sections: [
        {
          id: 'sec-1',
          title: 'Data collected',
          index: 0,
          questionCount: 1,
          questions: [
            {
              id: 'q-1',
              title: 'What data do you collect?',
              type: 'LONG_ANSWER_TEXT',
              comments: [
                {
                  id: 'c-q1',
                  level: 'QUESTION',
                  targetId: 'q-1',
                  content: 'Please list the exact fields.',
                  createdAt: '2026-01-01T00:00:00.000Z',
                },
                {
                  id: 'c-q2',
                  level: 'QUESTION',
                  targetId: 'q-1',
                  content: 'Resolved earlier.',
                  resolvedAt: '2026-01-02T00:00:00.000Z',
                  createdAt: '2026-01-01T00:00:00.000Z',
                },
              ],
            },
          ],
        },
      ],
    };

    const FOUND = {
      form: SKELETON,
      searchedCount: 20,
      matches: [
        {
          id: 'q-9',
          title: 'Describe your data retention practices.',
          type: 'LONG_ANSWER_TEXT',
          sectionId: 'sec-2',
          sectionTitle: 'Retention',
          selectedAnswers: [{ id: 'a-1', index: 0, value: 'Kept for 24 months.' }],
        },
      ],
    };

    it('returns just the matching questions when questionText is passed', async () => {
      mockGraphql.searchAssessmentQuestions.mockResolvedValue(FOUND);

      const result = (await getTool().handler({
        assessmentId: 'form-1',
        questionText: 'retention',
      })) as { data: Record<string, any> };

      expect(mockGraphql.getAssessment).not.toHaveBeenCalled();
      expect(result.data.questionMatches).toHaveLength(1);
      // Pulled out of the section nesting, a match has to say where it sits.
      expect(result.data.questionMatches[0].sectionTitle).toBe('Retention');
      expect(result.data.questionMatches[0].selectedAnswers[0].value).toBe('Kept for 24 months.');
      expect(result.data.matchNote).toContain('1 of 20');
    });

    it('reports an empty search as an answer rather than a failure', async () => {
      mockGraphql.searchAssessmentQuestions.mockResolvedValue({
        form: SKELETON,
        searchedCount: 20,
        matches: [],
      });

      const result = (await getTool().handler({
        assessmentId: 'form-1',
        questionText: 'biometric',
      })) as { data: Record<string, any> };

      // "The form does not ask about this" is what the caller wanted to know,
      // but only if it cannot be read as a broken lookup.
      expect(result.data.noMatches).toContain('search succeeded');
      expect(result.data.noMatches).toContain('biometric');
      expect(result.data).not.toHaveProperty('matchNote');
    });

    it('searches inside the named sections rather than expanding them', async () => {
      mockGraphql.searchAssessmentQuestions.mockResolvedValue(FOUND);

      await getTool().handler({
        assessmentId: 'form-1',
        questionText: 'retention',
        sectionIds: ['sec-2'],
      });

      expect(mockGraphql.getAssessment).not.toHaveBeenCalled();
      expect(mockGraphql.searchAssessmentQuestions).toHaveBeenCalledWith('form-1', 'retention', {
        sectionIds: ['sec-2'],
      });
    });

    it('drops the expand hint on a search, having already answered', async () => {
      mockGraphql.searchAssessmentQuestions.mockResolvedValue(FOUND);

      const result = (await getTool().handler({
        assessmentId: 'form-1',
        questionText: 'retention',
      })) as { data: Record<string, any> };

      expect(result.data).not.toHaveProperty('expandHint');
    });

    it('still counts the feedback on a search, the count being of the form', async () => {
      mockGraphql.searchAssessmentQuestions.mockResolvedValue(FOUND);
      mockGraphql.countAssessmentComments.mockResolvedValue({ FORM: 2, SECTION: 0, QUESTION: 1 });

      const result = (await getTool().handler({
        assessmentId: 'form-1',
        questionText: 'retention',
      })) as { data: Record<string, any> };

      expect(result.data.commentSummary.totalCount).toBe(3);
    });

    it('returns the section index without question bodies when sectionIds is omitted', async () => {
      mockGraphql.getAssessmentSkeleton.mockResolvedValue(SKELETON);

      const result = (await getTool().handler({
        assessmentId: 'form-1',
      })) as { success: boolean; data: Record<string, any> };

      expect(result.success).toBe(true);
      expect(mockGraphql.getAssessment).not.toHaveBeenCalled();
      expect(result.data.sections).toHaveLength(2);
      expect(result.data.sections[0].questionCount).toBe(12);
      expect(result.data.sections[0].questions).toBeUndefined();
      expect(result.data.expandHint).toContain('sectionIds');
    });

    it('expands only the requested sections', async () => {
      mockGraphql.getAssessment.mockResolvedValue(EXPANDED);

      const result = (await getTool().handler({
        assessmentId: 'form-1',
        sectionIds: ['sec-1'],
      })) as { success: boolean; data: Record<string, any> };

      expect(mockGraphql.getAssessmentSkeleton).not.toHaveBeenCalled();
      expect(mockGraphql.getAssessment).toHaveBeenCalledWith('form-1', {
        sectionIds: ['sec-1'],
      });
      expect(result.data.sections[0].questions).toHaveLength(1);
      expect(result.data.expandHint).toBeUndefined();
    });

    it('counts feedback without returning any of it', async () => {
      mockGraphql.getAssessmentSkeleton.mockResolvedValue(SKELETON);
      mockGraphql.countAssessmentComments.mockResolvedValue({
        FORM: 152,
        SECTION: 60,
        QUESTION: 40,
      });

      const result = (await getTool().handler({
        assessmentId: 'form-1',
      })) as { data: Record<string, any> };

      // Reading bodies is assessments_list_comments' job; this only says how
      // much there is and where.
      expect(result.data.comments).toBeUndefined();
      expect(mockGraphql.listAssessmentFormComments).not.toHaveBeenCalled();
      expect(mockGraphql.listAssessmentSectionComments).not.toHaveBeenCalled();
      expect(result.data.commentSummary.totalCount).toBe(252);
      expect(result.data.commentSummary.byLevel).toEqual({ FORM: 152, SECTION: 60, QUESTION: 40 });
      expect(result.data.commentSummary.readWith).toContain('assessments_list_comments');
    });

    it('counts question comments the same whether or not sections are expanded', async () => {
      mockGraphql.getAssessmentSkeleton.mockResolvedValue(SKELETON);
      mockGraphql.getAssessment.mockResolvedValue(EXPANDED);
      mockGraphql.countAssessmentComments.mockResolvedValue({ FORM: 2, SECTION: 1, QUESTION: 40 });

      const bare = (await getTool().handler({ assessmentId: 'form-1' })) as {
        data: Record<string, any>;
      };
      const expanded = (await getTool().handler({
        assessmentId: 'form-1',
        sectionIds: ['sec-1'],
      })) as { data: Record<string, any> };

      // The old shape reported 3 here and 43 there, so a caller who read the
      // total once had no way to know it was partial.
      expect(bare.data.commentSummary.totalCount).toBe(43);
      expect(expanded.data.commentSummary.totalCount).toBe(43);
    });

    it('says nothing about reading feedback when there is none', async () => {
      mockGraphql.getAssessmentSkeleton.mockResolvedValue(SKELETON);

      const result = (await getTool().handler({ assessmentId: 'form-1' })) as {
        data: Record<string, any>;
      };

      expect(result.data.commentSummary.totalCount).toBe(0);
      expect(result.data.commentSummary.readWith).toBeUndefined();
    });

    it('no longer takes the comment arguments that moved to assessments_list_comments', () => {
      const parsed = getTool().zodSchema.safeParse({
        assessmentId: 'form-1',
        includeComments: true,
        limit: 10,
      });
      expect(parsed.success).toBe(true);
      expect(parsed.data).not.toHaveProperty('includeComments');
      expect(parsed.data).not.toHaveProperty('limit');
    });

    it('no longer accepts the display-only assessmentName argument', () => {
      const parsed = getTool().zodSchema.safeParse({
        assessmentId: 'form-1',
        assessmentName: 'DPIA',
      });
      expect(parsed.success).toBe(true);
      expect(parsed.data).not.toHaveProperty('assessmentName');
    });
  });

  describe('assessments_list_comments', () => {
    const commentsTool = () => getTools().find((t) => t.name === 'assessments_list_comments')!;

    const comment = (
      id: string,
      level: string,
      targetId: string,
      extra: Record<string, unknown> = {},
    ) => ({
      id,
      level,
      targetId,
      content: `Comment ${id}`,
      createdAt: '2026-01-01T00:00:00.000Z',
      ...extra,
    });

    beforeEach(() => {
      mockGraphql.listAssessmentFormComments.mockResolvedValue({
        nodes: [comment('c-f1', 'FORM', 'form-1'), comment('c-f2', 'FORM', 'form-1')],
        totalCount: 2,
      });
      mockGraphql.listAssessmentSectionComments.mockResolvedValue({
        nodes: [comment('c-s1', 'SECTION', 'sec-1')],
        totalCount: 1,
      });
      mockGraphql.listAssessmentQuestionComments.mockResolvedValue({
        nodes: [comment('c-q1', 'QUESTION', 'q-1')],
        questionTitles: { 'q-1': 'What data do you collect?' },
        questionSections: { 'q-1': 'sec-1' },
        sectionTitles: {},
        sectionIds: ['sec-1', 'sec-2'],
      });
    });

    it('returns all three levels in one call, without needing sections expanded', async () => {
      const result = (await commentsTool().handler({
        assessmentId: 'form-1',
        resolution: 'OPEN',
        limit: 50,
        offset: 0,
      })) as { success: boolean; data: Record<string, any> };

      expect(result.success).toBe(true);
      expect(result.data.totalByLevel).toEqual({ FORM: 2, SECTION: 1, QUESTION: 1 });
      expect(result.data.totalCount).toBe(4);
      expect(mockGraphql.listAssessmentSectionComments).toHaveBeenCalledWith(
        ['sec-1', 'sec-2'],
        expect.objectContaining({ offset: 0 }),
      );
    });

    it('names the question a comment sits on', async () => {
      const result = (await commentsTool().handler({
        assessmentId: 'form-1',
        resolution: 'OPEN',
        limit: 50,
        offset: 0,
      })) as { data: Record<string, any> };

      const question = result.data.comments.find((c: any) => c.level === 'QUESTION');
      expect(question.questionTitle).toBe('What data do you collect?');
      // Form comments have no question to name.
      expect(result.data.comments.find((c: any) => c.level === 'FORM')).not.toHaveProperty(
        'questionTitle',
      );
    });

    it('narrows to one level and does not read the levels nobody asked for', async () => {
      const result = (await commentsTool().handler({
        assessmentId: 'form-1',
        resolution: 'OPEN',
        levels: ['QUESTION'],
        limit: 50,
        offset: 0,
      })) as { data: Record<string, any> };

      // Reading the form and section levels to throw them away costs round
      // trips on a form carrying hundreds of comments.
      expect(mockGraphql.listAssessmentFormComments).not.toHaveBeenCalled();
      expect(mockGraphql.listAssessmentSectionComments).not.toHaveBeenCalled();
      expect(result.data.comments.map((c: any) => c.level)).toEqual(['QUESTION']);
      expect(result.data.totalCount).toBe(1);
      expect(result.data.totalByLevel).toEqual({ FORM: 0, SECTION: 0, QUESTION: 1 });
    });

    it('takes more than one level at a time', async () => {
      const result = (await commentsTool().handler({
        assessmentId: 'form-1',
        resolution: 'OPEN',
        levels: ['SECTION', 'QUESTION'],
        limit: 50,
        offset: 0,
      })) as { data: Record<string, any> };

      expect(mockGraphql.listAssessmentFormComments).not.toHaveBeenCalled();
      expect(mockGraphql.listAssessmentSectionComments).toHaveBeenCalled();
      expect(result.data.totalCount).toBe(2);
      expect(result.data.totalByLevel).toEqual({ FORM: 0, SECTION: 1, QUESTION: 1 });
    });

    it('reads every level when levels is omitted', async () => {
      const result = (await commentsTool().handler({
        assessmentId: 'form-1',
        resolution: 'OPEN',
        limit: 50,
        offset: 0,
      })) as { data: Record<string, any> };

      expect(mockGraphql.listAssessmentFormComments).toHaveBeenCalled();
      expect(result.data.totalCount).toBe(4);
    });

    it('names the section a comment sits on', async () => {
      mockGraphql.listAssessmentQuestionComments.mockResolvedValue({
        nodes: [],
        questionTitles: {},
        questionSections: { 'q-1': 'sec-1' },
        sectionTitles: { 'sec-1': 'Data Storage and Security' },
        sectionIds: ['sec-1'],
      });

      const result = (await commentsTool().handler({
        assessmentId: 'form-1',
        resolution: 'OPEN',
        limit: 50,
        offset: 0,
      })) as { data: Record<string, any> };

      // A bare target id left the caller to look the section up in a second
      // call, which question comments never needed.
      const section = result.data.comments.find((c: any) => c.level === 'SECTION');
      expect(section.sectionTitle).toBe('Data Storage and Security');
      expect(result.data.comments.find((c: any) => c.level === 'FORM')).not.toHaveProperty(
        'sectionTitle',
      );
    });

    it('names the section a question comment sits in, not just the question', async () => {
      mockGraphql.listAssessmentFormComments.mockResolvedValue({ nodes: [], totalCount: 0 });
      mockGraphql.listAssessmentSectionComments.mockResolvedValue({ nodes: [], totalCount: 0 });
      mockGraphql.listAssessmentQuestionComments.mockResolvedValue({
        nodes: [comment('c-q1', 'QUESTION', 'q-1')],
        questionTitles: { 'q-1': 'What data do you collect?' },
        questionSections: { 'q-1': 'sec-1' },
        sectionTitles: { 'sec-1': 'Data Collection and Processing' },
        sectionIds: ['sec-1'],
      });

      const result = (await commentsTool().handler({
        assessmentId: 'form-1',
        resolution: 'OPEN',
        limit: 50,
        offset: 0,
      })) as { data: Record<string, any> };

      // Grouping feedback by section is otherwise a second read of the whole
      // form, since a question comment holds no route back to its section.
      const [question] = result.data.comments;
      expect(question.questionTitle).toBe('What data do you collect?');
      expect(question.sectionId).toBe('sec-1');
      expect(question.sectionTitle).toBe('Data Collection and Processing');
    });

    it('leaves the section unnamed when the form did not name it', async () => {
      mockGraphql.listAssessmentFormComments.mockResolvedValue({ nodes: [], totalCount: 0 });
      mockGraphql.listAssessmentSectionComments.mockResolvedValue({ nodes: [], totalCount: 0 });
      mockGraphql.listAssessmentQuestionComments.mockResolvedValue({
        nodes: [comment('c-q1', 'QUESTION', 'q-1')],
        questionTitles: {},
        questionSections: { 'q-1': 'sec-1' },
        sectionTitles: {},
        sectionIds: ['sec-1'],
      });

      const result = (await commentsTool().handler({
        assessmentId: 'form-1',
        resolution: 'OPEN',
        limit: 50,
        offset: 0,
      })) as { data: Record<string, any> };

      // An untitled section still has an id worth returning; an empty title
      // would read as a section named with nothing.
      const [question] = result.data.comments;
      expect(question.sectionId).toBe('sec-1');
      expect(question).not.toHaveProperty('sectionTitle');
      expect(question).not.toHaveProperty('questionTitle');
    });

    it('fails on an offset past the end rather than returning an empty page', async () => {
      // An empty page from a non-zero offset reads exactly like "this form has
      // no feedback", which is the wrong thing to report to a user.
      await expect(
        commentsTool().handler({
          assessmentId: 'form-1',
          resolution: 'OPEN',
          limit: 50,
          offset: 500,
        }),
      ).rejects.toThrow(/offset 500 is past the end of the result set: 4 comment\(s\)/);
    });

    it('still reports no matches, rather than a bad offset, when nothing matched', async () => {
      mockGraphql.listAssessmentFormComments.mockResolvedValue({ nodes: [], totalCount: 0 });
      mockGraphql.listAssessmentSectionComments.mockResolvedValue({ nodes: [], totalCount: 0 });
      mockGraphql.listAssessmentQuestionComments.mockResolvedValue({
        nodes: [],
        questionTitles: {},
        questionSections: { 'q-1': 'sec-1' },
        sectionTitles: {},
        sectionIds: [],
      });

      const result = (await commentsTool().handler({
        assessmentId: 'form-1',
        resolution: 'OPEN',
        limit: 50,
        offset: 500,
      })) as { data: Record<string, any> };

      expect(result.data.noMatches).toContain('no open feedback');
    });

    it('hides resolved feedback by default and can return it alone', async () => {
      mockGraphql.listAssessmentFormComments.mockResolvedValue({
        nodes: [
          comment('c-open', 'FORM', 'form-1'),
          comment('c-done', 'FORM', 'form-1', { resolvedAt: '2026-02-01T00:00:00.000Z' }),
        ],
        totalCount: 2,
      });
      mockGraphql.listAssessmentSectionComments.mockResolvedValue({ nodes: [], totalCount: 0 });
      mockGraphql.listAssessmentQuestionComments.mockResolvedValue({
        nodes: [],
        questionTitles: {},
        questionSections: { 'q-1': 'sec-1' },
        sectionTitles: {},
        sectionIds: [],
      });

      const open = (await commentsTool().handler({
        assessmentId: 'form-1',
        resolution: 'OPEN',
        limit: 50,
        offset: 0,
      })) as { data: Record<string, any> };
      const resolved = (await commentsTool().handler({
        assessmentId: 'form-1',
        resolution: 'RESOLVED',
        limit: 50,
        offset: 0,
      })) as { data: Record<string, any> };
      const all = (await commentsTool().handler({
        assessmentId: 'form-1',
        resolution: 'ALL',
        limit: 50,
        offset: 0,
      })) as { data: Record<string, any> };

      expect(open.data.comments.map((c: any) => c.id)).toEqual(['c-open']);
      expect(resolved.data.comments.map((c: any) => c.id)).toEqual(['c-done']);
      expect(all.data.totalCount).toBe(2);
    });

    it('filters by author upstream, and applies the same filter to question comments', async () => {
      mockGraphql.listAssessmentQuestionComments.mockResolvedValue({
        nodes: [
          comment('c-mine', 'QUESTION', 'q-1', { author: { id: 'u-1', name: 'Annalisa' } }),
          comment('c-theirs', 'QUESTION', 'q-1', { author: { id: 'u-2', name: 'Someone' } }),
        ],
        questionTitles: { 'q-1': 'What data do you collect?' },
        questionSections: { 'q-1': 'sec-1' },
        sectionTitles: {},
        sectionIds: ['sec-1'],
      });
      mockGraphql.listAssessmentFormComments.mockResolvedValue({ nodes: [], totalCount: 0 });
      mockGraphql.listAssessmentSectionComments.mockResolvedValue({ nodes: [], totalCount: 0 });

      const result = (await commentsTool().handler({
        assessmentId: 'form-1',
        authorIds: ['u-1'],
        resolution: 'OPEN',
        limit: 50,
        offset: 0,
      })) as { data: Record<string, any> };

      // Form and section comments filter at the API; question comments arrive
      // nested and unfiltered, so the same match has to happen here too.
      expect(mockGraphql.listAssessmentFormComments).toHaveBeenCalledWith(
        'form-1',
        expect.objectContaining({ authorIds: ['u-1'] }),
      );
      expect(result.data.comments.map((c: any) => c.id)).toEqual(['c-mine']);
    });

    it('pages the merged list and reports where the caller is in it', async () => {
      mockGraphql.listAssessmentFormComments.mockResolvedValue({
        nodes: [1, 2, 3, 4, 5].map((n) =>
          comment(`c-f${n}`, 'FORM', 'form-1', { createdAt: `2026-01-0${n}T00:00:00.000Z` }),
        ),
        totalCount: 5,
      });
      mockGraphql.listAssessmentSectionComments.mockResolvedValue({ nodes: [], totalCount: 0 });
      mockGraphql.listAssessmentQuestionComments.mockResolvedValue({
        nodes: [],
        questionTitles: {},
        questionSections: { 'q-1': 'sec-1' },
        sectionTitles: {},
        sectionIds: [],
      });

      const page = (await commentsTool().handler({
        assessmentId: 'form-1',
        resolution: 'OPEN',
        limit: 2,
        offset: 2,
      })) as { data: Record<string, any> };

      expect(page.data.comments.map((c: any) => c.id)).toEqual(['c-f3', 'c-f4']);
      expect(page.data.pageInfo).toEqual({ hasNextPage: true, hasPreviousPage: true });
    });

    it('reads past the first page of a source instead of dropping the rest', async () => {
      const all = Array.from({ length: 150 }, (_, n) =>
        comment(`c-f${String(n).padStart(3, '0')}`, 'FORM', 'form-1'),
      );
      mockGraphql.listAssessmentFormComments.mockImplementation(
        (_id: string, { offset }: { offset: number }) =>
          Promise.resolve({ nodes: all.slice(offset, offset + 100), totalCount: all.length }),
      );
      mockGraphql.listAssessmentSectionComments.mockResolvedValue({ nodes: [], totalCount: 0 });
      mockGraphql.listAssessmentQuestionComments.mockResolvedValue({
        nodes: [],
        questionTitles: {},
        questionSections: { 'q-1': 'sec-1' },
        sectionTitles: {},
        sectionIds: [],
      });

      const result = (await commentsTool().handler({
        assessmentId: 'form-1',
        resolution: 'OPEN',
        limit: 10,
        offset: 140,
      })) as { data: Record<string, any> };

      expect(mockGraphql.listAssessmentFormComments).toHaveBeenCalledTimes(2);
      expect(result.data.totalCount).toBe(150);
      expect(result.data.pageInfo.hasNextPage).toBe(false);
    });

    it('distinguishes no matching feedback from a form that could not be read', async () => {
      mockGraphql.listAssessmentFormComments.mockResolvedValue({ nodes: [], totalCount: 0 });
      mockGraphql.listAssessmentSectionComments.mockResolvedValue({ nodes: [], totalCount: 0 });
      mockGraphql.listAssessmentQuestionComments.mockResolvedValue({
        nodes: [],
        questionTitles: {},
        questionSections: { 'q-1': 'sec-1' },
        sectionTitles: {},
        sectionIds: [],
      });

      const result = (await commentsTool().handler({
        assessmentId: 'form-1',
        resolution: 'OPEN',
        limit: 50,
        offset: 0,
      })) as { success: boolean; data: Record<string, any> };

      expect(result.success).toBe(true);
      expect(result.data.totalCount).toBe(0);
      expect(result.data.noMatches).toContain('resolution ALL');
    });

    it('defaults to open feedback only', () => {
      const parsed = commentsTool().zodSchema.safeParse({ assessmentId: 'form-1' });
      expect(parsed.success).toBe(true);
      expect((parsed.data as any).resolution).toBe('OPEN');
    });
  });

  describe('assessments_list', () => {
    const listTool = () => getTools().find((t) => t.name === 'assessments_list')!;

    /** Parse through the schema so defaults land the way the server applies them. */
    const call = async (input: Record<string, unknown>) => {
      const tool = listTool();
      const parsed = tool.zodSchema.parse(input);
      return tool.handler(parsed as never);
    };

    const resolveList = (nodes: unknown[], totalCount = nodes.length, offset = 0) => {
      mockGraphql.listAssessments.mockResolvedValue({
        nodes,
        totalCount,
        pageInfo: {
          hasNextPage: offset + nodes.length < totalCount,
          hasPreviousPage: offset > 0,
        },
      });
    };

    const NODES = [
      { id: 'a1', title: 'Assessment 1', status: 'DRAFT' },
      { id: 'a2', title: 'Assessment 2', status: 'IN_PROGRESS' },
    ];

    it('rejects a status value outside the AssessmentFormStatus enum', () => {
      const result = listTool().zodSchema.safeParse({ statuses: ['INVALID_STATUS'] });
      expect(result.success).toBe(false);
      expect((result as any).error.issues[0].path).toEqual(['statuses', 0]);
    });

    it('no longer declares the singular status argument', () => {
      // Replaced by `statuses`. The server refuses unknown arguments (see
      // strict-arguments in mcp-server-base), so dropping it from the shape is
      // what turns the old name into an error rather than a silent no-op.
      const { shape } = listTool().zodSchema as unknown as { shape: Record<string, unknown> };
      expect(shape).not.toHaveProperty('status');
      expect(shape).toHaveProperty('statuses');
    });

    it('returns assessments with dashboard links on success', async () => {
      resolveList(NODES);

      const result = await call({ statuses: ['DRAFT'], limit: 25 });

      expect(result).toMatchObject({
        success: true,
        count: 2,
        totalCount: 2,
        hasNextPage: false,
      });
      expect((result as any).data[0]).toMatchObject({
        id: 'a1',
        url: expect.stringContaining('a1'),
      });
      expect(mockGraphql.listAssessments).toHaveBeenCalledWith(
        expect.objectContaining({
          first: 25,
          offset: 0,
          includeDetails: false,
          filterBy: { statuses: ['DRAFT'] },
        }),
      );
    });

    it('forwards every filter to the API rather than filtering client-side', async () => {
      resolveList(NODES);

      await call({
        statuses: ['IN_REVIEW'],
        text: 'rideshare',
        ids: ['a1'],
        assigneeIds: ['u1'],
        reviewerIds: ['u2'],
        externalAssigneeEmails: ['vendor@example.com'],
        templateIds: ['t1'],
        assessmentGroupIds: ['g1'],
        createdAfter: '2026-01-01',
        createdBefore: '2026-04-01',
        dueAfter: '2026-02-01',
        dueBefore: '2026-03-01',
      });

      expect(mockGraphql.listAssessments).toHaveBeenCalledWith(
        expect.objectContaining({
          filterBy: {
            statuses: ['IN_REVIEW'],
            text: 'rideshare',
            ids: ['a1'],
            assigneeIds: ['u1'],
            reviewerIds: ['u2'],
            externalAssigneeEmails: ['vendor@example.com'],
            templateIds: ['t1'],
            assessmentGroupIds: ['g1'],
            createdAtAfter: '2026-01-01',
            createdAtBefore: '2026-04-01',
            dueDateAfter: '2026-02-01',
            dueDateBefore: '2026-03-01',
          },
        }),
      );
    });

    it('rejects a date that is not ISO 8601 and names the field', () => {
      const result = listTool().zodSchema.safeParse({ dueBefore: 'last friday' });
      expect(result.success).toBe(false);
      expect((result as any).error.issues[0].message).toContain('dueBefore');
      expect((result as any).error.issues[0].message).toContain('2026-01-31');
    });

    it('accepts a full timestamp as well as a bare date', () => {
      expect(listTool().zodSchema.safeParse({ createdAfter: '2026-01-31T09:30:00Z' }).success).toBe(
        true,
      );
    });

    it('maps caller sort names onto the GraphQL order field', async () => {
      resolveList(NODES);

      await call({ sortBy: 'status', sortDirection: 'DESC' });

      expect(mockGraphql.listAssessments).toHaveBeenCalledWith(
        expect.objectContaining({ sortField: 'statusRank', sortDirection: 'DESC' }),
      );
    });

    it('omits sorting entirely when sortBy is not given', async () => {
      resolveList(NODES);

      await call({});

      const [args] = mockGraphql.listAssessments.mock.calls[0];
      expect(args).not.toHaveProperty('sortField');
    });

    it('rejects an unknown sortBy and lists the valid columns', () => {
      const result = listTool().zodSchema.safeParse({ sortBy: 'dueDate' });
      expect(result.success).toBe(false);
      expect((result as any).error.issues[0].message).toContain('title, status, submittedAt');
    });

    it('gates the expensive detail fields behind includeDetails', async () => {
      resolveList(NODES);

      await call({ includeDetails: true });

      expect(mockGraphql.listAssessments).toHaveBeenCalledWith(
        expect.objectContaining({ includeDetails: true }),
      );
    });

    it('pages with offset and reports that more remain', async () => {
      resolveList(NODES, 120, 50);

      const result = await call({ limit: 50, offset: 50 });

      expect(mockGraphql.listAssessments).toHaveBeenCalledWith(
        expect.objectContaining({ first: 50, offset: 50 }),
      );
      expect(result).toMatchObject({ hasNextPage: true, totalCount: 120 });
      expect((result as any).paginationNote).toContain('offset 100');
    });

    it('says so plainly on the last page', async () => {
      resolveList(NODES, 52, 50);

      const result = await call({ limit: 50, offset: 50 });

      expect((result as any).paginationNote).toContain('No further pages');
    });

    it('distinguishes no matches from a broken query and names the filters', async () => {
      resolveList([], 0);

      const result = await call({ statuses: ['APPROVED'], text: 'nope' });

      expect(result).toMatchObject({ success: true, count: 0 });
      const note = (result as any).paginationNote;
      expect(note).toContain('statuses');
      expect(note).toContain('text');
      expect(note).toContain('query succeeded');
    });

    it('reports an empty organization differently from an over-filtered one', async () => {
      resolveList([], 0);

      const result = await call({});

      expect((result as any).paginationNote).toContain('no assessments');
    });

    it('rejects an offset past the end instead of implying nothing matched', async () => {
      resolveList([], 12, 500);

      await expect(call({ offset: 500 })).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        message: expect.stringContaining('past the end'),
        details: { offset: 500, totalCount: 12 },
      });
    });

    it('allows offset 0 against an empty result set', async () => {
      resolveList([], 0);

      await expect(call({ offset: 0 })).resolves.toMatchObject({ count: 0 });
    });

    it('throws when client throws', async () => {
      mockGraphql.listAssessments.mockRejectedValue(new Error('API unavailable'));

      await expect(call({ limit: 50 })).rejects.toThrow('API unavailable');
    });
  });

  describe('assessments_create', () => {
    it('zodSchema rejects when title is missing', () => {
      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_create')!;

      const result = tool.zodSchema.safeParse({ assessmentGroupId: 'grp-1' });
      expect(result.success).toBe(false);
      expect((result as any).error.issues[0].path).toEqual(['title']);
    });

    it('creates assessment with group_id on success', async () => {
      const mockAssessment = {
        id: 'assess-1',
        title: 'My Assessment',
        status: 'DRAFT',
      };
      mockGraphql.createAssessment.mockResolvedValue(mockAssessment);

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_create')!;

      const result = await tool.handler({
        title: 'My Assessment',
        assessmentGroupId: 'grp-123',
      });

      expect(result).toMatchObject({
        success: true,
        data: expect.objectContaining({
          assessment: expect.objectContaining(mockAssessment),
          message: expect.stringContaining('created successfully'),
        }),
      });
      expect(mockGraphql.createAssessment).toHaveBeenCalledWith({
        title: 'My Assessment',
        assessmentGroupId: 'grp-123',
        assigneeIds: undefined,
      });
    });

    it('resolves templateId to assessmentGroupId when assessmentGroupId not provided', async () => {
      const mockGroup = {
        id: 'grp-from-template',
        assessmentFormTemplate: { id: 'tpl-1' },
      };
      mockGraphql.listAssessmentGroups.mockResolvedValue({
        nodes: [mockGroup],
        totalCount: 1,
        pageInfo: { hasNextPage: false },
      });

      const mockAssessment = {
        id: 'assess-2',
        title: 'From Template',
        status: 'DRAFT',
      };
      mockGraphql.createAssessment.mockResolvedValue(mockAssessment);

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_create')!;

      const result = await tool.handler({
        title: 'From Template',
        templateId: 'tpl-1',
      });

      expect(result).toMatchObject({
        success: true,
        data: expect.objectContaining({
          assessment: expect.objectContaining(mockAssessment),
        }),
      });
      expect(mockGraphql.listAssessmentGroups).toHaveBeenCalledWith({ first: 100 });
      expect(mockGraphql.createAssessment).toHaveBeenCalledWith({
        title: 'From Template',
        assessmentGroupId: 'grp-from-template',
        assigneeIds: undefined,
      });
    });

    it('throws when client throws', async () => {
      mockGraphql.createAssessment.mockRejectedValue(new Error('Group not found'));

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_create')!;

      await expect(
        tool.handler({
          title: 'Test',
          assessmentGroupId: 'grp-bad',
        }),
      ).rejects.toThrow('Group not found');
    });
  });

  describe('assessments_create_template', () => {
    it('zodSchema rejects when title is missing', () => {
      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_create_template')!;

      const result = tool.zodSchema.safeParse({
        sections: [{ title: 'Section 1', questions: [] }],
      });
      expect(result.success).toBe(false);
      expect((result as any).error.issues[0].path).toEqual(['title']);
    });

    it('creates template on success', async () => {
      const mockTemplate = {
        id: 'tpl-new',
        title: 'New Template',
        status: 'DRAFT',
      };
      mockGraphql.createAssessmentFormTemplate.mockResolvedValue(mockTemplate);

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_create_template')!;

      const result = await tool.handler({
        title: 'New Template',
        description: 'A test template',
        status: 'DRAFT',
        sections: [
          {
            title: 'Section 1',
            questions: [
              {
                title: 'Question 1',
                type: 'SHORT_ANSWER_TEXT',
              },
            ],
          },
        ],
      });

      expect(result).toMatchObject({
        success: true,
        data: expect.objectContaining({
          template: mockTemplate,
          message: expect.stringContaining('created successfully'),
        }),
      });
      expect(mockGraphql.createAssessmentFormTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Template',
          description: 'A test template',
          status: 'DRAFT',
          sections: expect.any(Array),
        }),
      );
    });

    it('throws when client throws', async () => {
      mockGraphql.createAssessmentFormTemplate.mockRejectedValue(
        new Error('Template creation failed'),
      );

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_create_template')!;

      await expect(
        tool.handler({
          title: 'Failing Template',
        }),
      ).rejects.toThrow('Template creation failed');
    });
  });

  describe('assessments_answer_question', () => {
    it('zodSchema rejects when assessmentQuestionId is missing', () => {
      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_answer_question')!;

      const result = tool.zodSchema.safeParse({ assessmentAnswerIds: ['ans-1'] });
      expect(result.success).toBe(false);
      expect((result as any).error.issues[0].path).toEqual(['assessmentQuestionId']);
    });

    it('answers question with answer IDs on success', async () => {
      const mockSelected = [{ id: 'ans-1', value: 'Option A' }];
      mockGraphql.selectAssessmentQuestionAnswers.mockResolvedValue(mockSelected);

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_answer_question')!;

      const result = await tool.handler({
        assessmentQuestionId: 'q1',
        assessmentAnswerIds: ['ans-1'],
      });

      expect(result).toMatchObject({
        success: true,
        data: expect.objectContaining({
          selectedAnswers: mockSelected,
          message: expect.stringContaining('answered successfully'),
        }),
      });
      expect(mockGraphql.selectAssessmentQuestionAnswers).toHaveBeenCalledWith({
        assessmentQuestionId: 'q1',
        assessmentAnswerIds: ['ans-1'],
      });
    });

    it('answers question with answer values (text) on success', async () => {
      const mockSelected = [{ value: 'Custom answer', isUserCreated: true }];
      mockGraphql.selectAssessmentQuestionAnswers.mockResolvedValue(mockSelected);

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_answer_question')!;

      const result = await tool.handler({
        assessmentQuestionId: 'q2',
        assessmentAnswerValues: [{ value: 'My text answer', isUserCreated: true }],
      });

      expect(result).toMatchObject({
        success: true,
        data: expect.objectContaining({
          selectedAnswers: mockSelected,
        }),
      });
      expect(mockGraphql.selectAssessmentQuestionAnswers).toHaveBeenCalledWith({
        assessmentQuestionId: 'q2',
        assessmentAnswerValues: [{ value: 'My text answer', isUserCreated: true }],
      });
    });

    it('throws when client throws', async () => {
      mockGraphql.selectAssessmentQuestionAnswers.mockRejectedValue(
        new Error('Question not found'),
      );

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_answer_question')!;

      await expect(
        tool.handler({
          assessmentQuestionId: 'q-bad',
          assessmentAnswerIds: ['ans-1'],
        }),
      ).rejects.toThrow('Question not found');
    });
  });

  describe('assessments_prefill', () => {
    it('zodSchema rejects when title is missing', () => {
      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_prefill')!;

      const result = tool.zodSchema.safeParse({
        assessmentGroupId: 'grp-1',
        answers: { Q1: 'A1' },
      });
      expect(result.success).toBe(false);
      expect((result as any).error.issues[0].path).toEqual(['title']);
    });

    it('zodSchema rejects when answers is missing', () => {
      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_prefill')!;

      const result = tool.zodSchema.safeParse({
        title: 'Prefill Test',
        assessmentGroupId: 'grp-1',
      });
      expect(result.success).toBe(false);
      expect((result as any).error.issues[0].path).toEqual(['answers']);
    });

    it('returns error when neither templateId nor assessmentGroupId provided', async () => {
      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_prefill')!;

      const result = await tool.handler({
        title: 'Prefill Test',
        answers: { Q1: 'A1' },
      });

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('templateId or assessmentGroupId'),
      });
      expect(mockGraphql.createAssessment).not.toHaveBeenCalled();
    });

    it('prefills assessment on happy path (multi-step flow)', async () => {
      const mockAssessment = {
        id: 'assess-prefill-1',
        title: 'Prefilled Assessment',
        status: 'DRAFT',
      };
      mockGraphql.createAssessment.mockResolvedValue(mockAssessment);

      const mockFullForm = {
        id: 'assess-prefill-1',
        title: 'Prefilled Assessment',
        status: 'DRAFT',
        sections: [
          {
            id: 'sec-1',
            questions: [
              {
                id: 'q1',
                title: 'What is your name?',
                referenceId: 'ref-1',
                type: 'SHORT_ANSWER_TEXT',
                answerOptions: [],
              },
              {
                id: 'q2',
                title: 'Select one',
                referenceId: 'ref-2',
                type: 'SINGLE_SELECT',
                answerOptions: [
                  { id: 'opt-a', value: 'Option A' },
                  { id: 'opt-b', value: 'Option B' },
                ],
              },
            ],
          },
        ],
      };
      mockGraphql.getAssessment.mockResolvedValue(mockFullForm);
      mockGraphql.selectAssessmentQuestionAnswers.mockResolvedValue([]);

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_prefill')!;

      const result = await tool.handler({
        title: 'Prefilled Assessment',
        assessmentGroupId: 'grp-prefill',
        answers: {
          'What is your name?': 'Alice',
          'Select one': 'Option A',
        },
      });

      expect(result).toMatchObject({
        success: true,
        data: expect.objectContaining({
          assessmentId: 'assess-prefill-1',
          title: 'Prefilled Assessment',
          answersApplied: expect.any(Number),
          totalQuestions: 2,
          results: expect.any(Array),
          message: expect.stringContaining('created and prefilled'),
        }),
      });
      expect(mockGraphql.createAssessment).toHaveBeenCalledWith({
        title: 'Prefilled Assessment',
        assessmentGroupId: 'grp-prefill',
      });
      expect(mockGraphql.getAssessment).toHaveBeenCalledWith('assess-prefill-1');
      expect(mockGraphql.selectAssessmentQuestionAnswers).toHaveBeenCalledTimes(2);
    });

    it('returns early success when form has no sections', async () => {
      const mockAssessment = {
        id: 'assess-empty',
        title: 'Empty Form',
        status: 'DRAFT',
      };
      mockGraphql.createAssessment.mockResolvedValue(mockAssessment);
      mockGraphql.getAssessment.mockResolvedValue({
        id: 'assess-empty',
        title: 'Empty Form',
        sections: [],
      });

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_prefill')!;

      const result = await tool.handler({
        title: 'Empty Form',
        assessmentGroupId: 'grp-1',
        answers: { Q1: 'A1' },
      });

      expect(result).toMatchObject({
        success: true,
        data: expect.objectContaining({
          assessment: expect.objectContaining({ id: 'assess-empty' }),
          answersApplied: 0,
          message: expect.stringContaining('no sections/questions'),
        }),
      });
      expect(mockGraphql.selectAssessmentQuestionAnswers).not.toHaveBeenCalled();
    });

    it('throws when client throws during create', async () => {
      mockGraphql.createAssessment.mockRejectedValue(new Error('Create failed'));

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_prefill')!;

      await expect(
        tool.handler({
          title: 'Failing Prefill',
          assessmentGroupId: 'grp-1',
          answers: { Q1: 'A1' },
        }),
      ).rejects.toThrow('Create failed');
    });
  });

  describe('admin dashboard deep links', () => {
    const FORM_ID = '1928a56a-26b9-40f1-aac3-1b5208cd256e';
    const GROUP_ID = '44dc90f1-71b8-4bb7-a2ae-053985605cf1';

    it('assessments_create returns the form response url for DRAFT status', async () => {
      mockGraphql.createAssessment.mockResolvedValue({
        id: FORM_ID,
        title: 'DPIA',
        status: 'DRAFT',
        assessmentGroupId: GROUP_ID,
      });

      const tool = getTools().find((t) => t.name === 'assessments_create')!;
      const result = (await tool.handler({
        title: 'DPIA',
        assessmentGroupId: GROUP_ID,
      })) as { success: boolean; data: Record<string, unknown> };

      expect(result.success).toBe(true);
      expect(result.data.url).toBe(
        `https://app.transcend.io/assessments/forms/${FORM_ID}/response`,
      );
      // The per-assessment tools only surface a single `url` field — exposing
      // `groupUrl` alongside it tempts LLM clients to render the group page
      // instead of the assessment.
      expect(result.data.groupUrl).toBeUndefined();
      // Should never surface the assignee-only /view route — it 404s for non-assignees.
      expect(JSON.stringify(result.data)).not.toContain('/view');
      expect(result.data.message).toContain(
        `https://app.transcend.io/assessments/forms/${FORM_ID}/response`,
      );
    });

    it('assessments_submit_response returns the form response URL even for IN_REVIEW status', async () => {
      // The dashboard's own "View Responses" row action sends reviewers to
      // /response regardless of status — the previous IN_REVIEW -> group
      // special case mirrored the email link convention, but that's a
      // different audience. Per-assessment MCP responses should always
      // point at the specific assessment.
      mockGraphql.submitAssessmentForReview.mockResolvedValue({
        id: FORM_ID,
        title: 'DPIA',
        status: 'IN_REVIEW',
        assessmentGroupId: GROUP_ID,
      });

      const tool = getTools().find((t) => t.name === 'assessments_submit_response')!;
      const result = (await tool.handler({
        assessmentId: FORM_ID,
        assessmentSectionIds: ['sec-1'],
      })) as { success: boolean; data: Record<string, unknown> };

      expect(result.success).toBe(true);
      expect(result.data.url).toBe(
        `https://app.transcend.io/assessments/forms/${FORM_ID}/response`,
      );
      expect(result.data.groupUrl).toBeUndefined();
      expect(result.data.message).toContain(
        `https://app.transcend.io/assessments/forms/${FORM_ID}/response`,
      );
    });

    it('assessments_get returns the form response URL for APPROVED status', async () => {
      mockGraphql.getAssessmentSkeleton.mockResolvedValue({
        id: FORM_ID,
        title: 'DPIA',
        status: 'APPROVED',
        assessmentGroupId: GROUP_ID,
      });

      const tool = getTools().find((t) => t.name === 'assessments_get')!;
      const result = (await tool.handler({ assessmentId: FORM_ID })) as {
        success: boolean;
        data: Record<string, unknown>;
      };

      expect(result.success).toBe(true);
      expect(result.data.url).toBe(
        `https://app.transcend.io/assessments/forms/${FORM_ID}/response`,
      );
      expect(result.data.groupUrl).toBeUndefined();
    });

    it('assessments_list attaches a /response url to each row regardless of status', async () => {
      mockGraphql.listAssessments.mockResolvedValue({
        nodes: [
          { id: FORM_ID, title: 'Draft', status: 'DRAFT', assessmentGroupId: GROUP_ID },
          { id: 'form-2', title: 'In Review', status: 'IN_REVIEW', assessmentGroupId: GROUP_ID },
        ],
        totalCount: 2,
        pageInfo: { hasNextPage: false },
      });

      const tool = getTools().find((t) => t.name === 'assessments_list')!;
      const result = (await tool.handler({ limit: 50 })) as {
        success: boolean;
        data: Array<Record<string, unknown>>;
      };

      expect(result.success).toBe(true);
      // Every row gets the same canonical /response URL regardless of
      // status — matches the dashboard's "View Responses" row action.
      expect(result.data[0]!.url).toBe(
        `https://app.transcend.io/assessments/forms/${FORM_ID}/response`,
      );
      expect(result.data[1]!.url).toBe(
        `https://app.transcend.io/assessments/forms/form-2/response`,
      );
      // Per-assessment rows must not expose a sibling `groupUrl` — agents will
      // pick it over the canonical `url` and route every link to the group page.
      expect(result.data[0]!.groupUrl).toBeUndefined();
      expect(result.data[1]!.groupUrl).toBeUndefined();
      // No row should expose the assignee-only /view route.
      expect(JSON.stringify(result.data)).not.toContain('/view');
    });

    it('assessments_list_groups attaches a groupUrl to each row', async () => {
      mockGraphql.listAssessmentGroups.mockResolvedValue({
        nodes: [
          { id: 'grp-1', title: 'Group 1' },
          { id: 'grp-2', title: 'Group 2' },
        ],
        totalCount: 2,
        pageInfo: { hasNextPage: false },
      });

      const tool = getTools().find((t) => t.name === 'assessments_list_groups')!;
      const result = (await tool.handler({ limit: 50 })) as {
        success: boolean;
        data: Array<Record<string, unknown>>;
      };

      expect(result.success).toBe(true);
      expect(result.data[0]!.groupUrl).toBe('https://app.transcend.io/assessments/groups/grp-1');
      expect(result.data[1]!.groupUrl).toBe('https://app.transcend.io/assessments/groups/grp-2');
    });

    it('honors a caller-supplied dashboard URL on the ToolClients', async () => {
      mockGraphql.createAssessment.mockResolvedValue({
        id: FORM_ID,
        title: 'DPIA',
        status: 'DRAFT',
        assessmentGroupId: GROUP_ID,
      });

      const tool = getTools('https://app.staging.transcend.io').find(
        (t) => t.name === 'assessments_create',
      )!;
      const result = (await tool.handler({
        title: 'DPIA',
        assessmentGroupId: GROUP_ID,
      })) as { success: boolean; data: Record<string, unknown> };

      expect(result.data.url).toBe(
        `https://app.staging.transcend.io/assessments/forms/${FORM_ID}/response`,
      );
    });
  });
});
