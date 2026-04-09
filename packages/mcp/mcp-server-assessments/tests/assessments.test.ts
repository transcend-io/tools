import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getAssessmentTools } from '../src/tools.js';

describe('Assessment Tools', () => {
  let mockGraphql: {
    listAssessments: ReturnType<typeof vi.fn>;
    listAssessmentGroups: ReturnType<typeof vi.fn>;
    createAssessment: ReturnType<typeof vi.fn>;
    getAssessment: ReturnType<typeof vi.fn>;
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
      createAssessmentFormTemplate: vi.fn(),
      selectAssessmentQuestionAnswers: vi.fn(),
      updateAssessmentFormAssignees: vi.fn(),
      updateAssessment: vi.fn(),
      submitAssessmentForReview: vi.fn(),
    };
  });

  const getTools = () =>
    getAssessmentTools({
      rest: {} as never,
      graphql: mockGraphql,
    });

  describe('assessments_list', () => {
    it('returns validation error when status is invalid', async () => {
      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_list')!;

      const result = await tool.handler({ status: 'INVALID_STATUS' });

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('Invalid input'),
      });
      expect(mockGraphql.listAssessments).not.toHaveBeenCalled();
    });

    it('returns assessments on success', async () => {
      const mockNodes = [
        { id: 'a1', title: 'Assessment 1', status: 'DRAFT' },
        { id: 'a2', title: 'Assessment 2', status: 'IN_PROGRESS' },
      ];
      mockGraphql.listAssessments.mockResolvedValue({
        nodes: mockNodes,
        totalCount: 2,
        pageInfo: { hasNextPage: false },
      });

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_list')!;

      const result = await tool.handler({ status: 'DRAFT', limit: 25 });

      expect(result).toMatchObject({
        success: true,
        data: mockNodes,
        count: 2,
        totalCount: 2,
        hasNextPage: false,
      });
      expect(mockGraphql.listAssessments).toHaveBeenCalledWith({
        first: 25,
        filterBy: { statuses: ['DRAFT'] },
      });
    });

    it('returns error when client throws', async () => {
      mockGraphql.listAssessments.mockRejectedValue(new Error('API unavailable'));

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_list')!;

      const result = await tool.handler({ limit: 50 });

      expect(result).toMatchObject({
        success: false,
        error: 'API unavailable',
      });
    });
  });

  describe('assessments_create', () => {
    it('returns validation error when title is missing', async () => {
      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_create')!;

      const result = await tool.handler({
        assessment_group_id: 'grp-1',
      });

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('Invalid input'),
      });
      expect(mockGraphql.createAssessment).not.toHaveBeenCalled();
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
        assessment_group_id: 'grp-123',
      });

      expect(result).toMatchObject({
        success: true,
        data: expect.objectContaining({
          assessment: mockAssessment,
          message: expect.stringContaining('created successfully'),
        }),
      });
      expect(mockGraphql.createAssessment).toHaveBeenCalledWith({
        title: 'My Assessment',
        assessmentGroupId: 'grp-123',
        assigneeIds: undefined,
      });
    });

    it('resolves template_id to group_id when assessment_group_id not provided', async () => {
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
        template_id: 'tpl-1',
      });

      expect(result).toMatchObject({
        success: true,
        data: expect.objectContaining({
          assessment: mockAssessment,
        }),
      });
      expect(mockGraphql.listAssessmentGroups).toHaveBeenCalledWith({ first: 100 });
      expect(mockGraphql.createAssessment).toHaveBeenCalledWith({
        title: 'From Template',
        assessmentGroupId: 'grp-from-template',
        assigneeIds: undefined,
      });
    });

    it('returns error when client throws', async () => {
      mockGraphql.createAssessment.mockRejectedValue(new Error('Group not found'));

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_create')!;

      const result = await tool.handler({
        title: 'Test',
        assessment_group_id: 'grp-bad',
      });

      expect(result).toMatchObject({
        success: false,
        error: 'Group not found',
      });
    });
  });

  describe('assessments_create_template', () => {
    it('returns validation error when title is missing', async () => {
      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_create_template')!;

      const result = await tool.handler({
        sections: [{ title: 'Section 1', questions: [] }],
      });

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('Invalid input'),
      });
      expect(mockGraphql.createAssessmentFormTemplate).not.toHaveBeenCalled();
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

    it('returns error when client throws', async () => {
      mockGraphql.createAssessmentFormTemplate.mockRejectedValue(
        new Error('Template creation failed'),
      );

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_create_template')!;

      const result = await tool.handler({
        title: 'Failing Template',
      });

      expect(result).toMatchObject({
        success: false,
        error: 'Template creation failed',
      });
    });
  });

  describe('assessments_answer_question', () => {
    it('returns validation error when assessment_question_id is missing', async () => {
      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_answer_question')!;

      const result = await tool.handler({
        assessment_answer_ids: ['ans-1'],
      });

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('Invalid input'),
      });
      expect(mockGraphql.selectAssessmentQuestionAnswers).not.toHaveBeenCalled();
    });

    it('answers question with answer IDs on success', async () => {
      const mockSelected = [{ id: 'ans-1', value: 'Option A' }];
      mockGraphql.selectAssessmentQuestionAnswers.mockResolvedValue(mockSelected);

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_answer_question')!;

      const result = await tool.handler({
        assessment_question_id: 'q1',
        assessment_answer_ids: ['ans-1'],
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
        assessment_question_id: 'q2',
        assessment_answer_values: [{ value: 'My text answer', isUserCreated: true }],
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

    it('returns error when client throws', async () => {
      mockGraphql.selectAssessmentQuestionAnswers.mockRejectedValue(
        new Error('Question not found'),
      );

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_answer_question')!;

      const result = await tool.handler({
        assessment_question_id: 'q-bad',
        assessment_answer_ids: ['ans-1'],
      });

      expect(result).toMatchObject({
        success: false,
        error: 'Question not found',
      });
    });
  });

  describe('assessments_prefill', () => {
    it('returns validation error when title is missing', async () => {
      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_prefill')!;

      const result = await tool.handler({
        assessment_group_id: 'grp-1',
        answers: { Q1: 'A1' },
      });

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('Invalid input'),
      });
      expect(mockGraphql.createAssessment).not.toHaveBeenCalled();
    });

    it('returns validation error when answers is missing', async () => {
      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_prefill')!;

      const result = await tool.handler({
        title: 'Prefill Test',
        assessment_group_id: 'grp-1',
      });

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('Invalid input'),
      });
      expect(mockGraphql.createAssessment).not.toHaveBeenCalled();
    });

    it('returns error when neither template_id nor assessment_group_id provided', async () => {
      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_prefill')!;

      const result = await tool.handler({
        title: 'Prefill Test',
        answers: { Q1: 'A1' },
      });

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('template_id or assessment_group_id'),
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
        assessment_group_id: 'grp-prefill',
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
        assessment_group_id: 'grp-1',
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

    it('returns error when client throws during create', async () => {
      mockGraphql.createAssessment.mockRejectedValue(new Error('Create failed'));

      const tools = getTools();
      const tool = tools.find((t) => t.name === 'assessments_prefill')!;

      const result = await tool.handler({
        title: 'Failing Prefill',
        assessment_group_id: 'grp-1',
        answers: { Q1: 'A1' },
      });

      expect(result).toMatchObject({
        success: false,
        error: 'Create failed',
      });
    });
  });
});
