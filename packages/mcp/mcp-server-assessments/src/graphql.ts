import {
  TranscendGraphQLBase,
  type PaginatedResponse,
  type Assessment,
  type AssessmentTemplate,
  type AssessmentGroup,
  type AssessmentCreateInput,
  type AssessmentUpdateInput,
  type AssessmentSubmitForReviewInput,
  type AssessmentTemplateCreateInput,
  type AssessmentTemplateExport,
  type AssessmentQuestionInput,
  type ListOptions,
} from '@transcend-io/mcp-server-core';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function normalizeQuestion(q: AssessmentQuestionInput): Record<string, unknown> {
  let { referenceId, subType, allowSelectOther, requireRiskEvaluation } = q;

  if (!referenceId || !UUID_RE.test(referenceId)) {
    referenceId = generateUUID();
  }

  if (allowSelectOther && (!subType || subType === 'NONE')) {
    subType = 'CUSTOM';
  }

  if (requireRiskEvaluation && !q.riskFrameworkId) {
    requireRiskEvaluation = false;
  }

  return {
    title: q.title,
    type: q.type,
    subType: subType || 'NONE',
    placeholder: q.placeholder || '',
    description: q.description || '',
    isRequired: q.isRequired ?? false,
    referenceId,
    answerOptions: q.answerOptions || [],
    allowSelectOther: allowSelectOther ?? false,
    requireRiskEvaluation: requireRiskEvaluation ?? false,
    ...(q.riskLogic && { riskLogic: q.riskLogic }),
    ...(q.riskCategoryIds && { riskCategoryIds: q.riskCategoryIds }),
    ...(q.riskFrameworkId && { riskFrameworkId: q.riskFrameworkId }),
    ...(q.displayLogic && { displayLogic: q.displayLogic }),
  };
}

export class AssessmentsMixin extends TranscendGraphQLBase {
  async listAssessments(
    options?: ListOptions & { filterBy?: { statuses?: string[] } },
  ): Promise<PaginatedResponse<Assessment>> {
    const query = `
      query ListAssessments($first: Int, $filterBy: AssessmentFormFiltersInput) {
        assessmentForms(first: $first, filterBy: $filterBy) {
          nodes {
            id
            title
            status
            createdAt
          }
          totalCount
        }
      }
    `;
    const data = await this.makeRequest<{
      assessmentForms: { nodes: Assessment[]; totalCount: number };
    }>(query, {
      first: Math.min(options?.first || 50, 100),
      filterBy: options?.filterBy?.statuses ? { statuses: options.filterBy.statuses } : undefined,
    });
    return {
      nodes: data.assessmentForms.nodes,
      pageInfo: {
        hasNextPage: data.assessmentForms.nodes.length < data.assessmentForms.totalCount,
        hasPreviousPage: false,
      },
      totalCount: data.assessmentForms.totalCount,
    };
  }

  async getAssessment(id: string): Promise<Assessment> {
    const query = `
      query GetAssessment($ids: [ID!]!) {
        assessmentForms(first: 1, filterBy: { ids: $ids }) {
          nodes {
            id
            title
            status
            dueDate
            submittedAt
            createdAt
            updatedAt
            sections {
              id
              title
              index
              status
              questions {
                id
                title
                index
                type
                subType
                description
                isRequired
                placeholder
                answerOptions {
                  id
                  index
                  value
                }
                selectedAnswers {
                  id
                  index
                  value
                }
              }
            }
          }
        }
      }
    `;
    const data = await this.makeRequest<{ assessmentForms: { nodes: Assessment[] } }>(query, {
      ids: [id],
    });
    const node = data.assessmentForms.nodes[0];
    if (!node) {
      throw new Error(`Assessment with id ${id} not found`);
    }
    return node;
  }

  async selectAssessmentQuestionAnswers(input: {
    assessmentQuestionId: string;
    assessmentAnswerIds?: string[];
    assessmentAnswerValues?: { value: string; isUserCreated: boolean }[];
  }): Promise<Array<{ id: string; index: number; value: string }>> {
    const mutation = `
      mutation SelectAssessmentQuestionAnswers($input: SelectAssessmentQuestionAnswerInput!) {
        selectAssessmentQuestionAnswers(input: $input) {
          selectedAnswers {
            id
            index
            value
          }
        }
      }
    `;
    const data = await this.makeRequest<{
      selectAssessmentQuestionAnswers: {
        selectedAnswers: Array<{ id: string; index: number; value: string }>;
      };
    }>(mutation, { input });
    return data.selectAssessmentQuestionAnswers.selectedAnswers;
  }

  async updateAssessmentFormAssignees(input: {
    id: string;
    assigneeIds?: string[];
    externalAssigneeEmails?: string[];
  }): Promise<{ id: string; title: string; status: string }> {
    const mutation = `
      mutation UpdateAssessmentFormAssignees($input: UpdateAssessmentFormAssigneesInput!) {
        updateAssessmentFormAssignees(input: $input) {
          assessmentForm {
            id
            title
            status
          }
        }
      }
    `;
    const data = await this.makeRequest<{
      updateAssessmentFormAssignees: {
        assessmentForm: { id: string; title: string; status: string };
      };
    }>(mutation, { input });
    return data.updateAssessmentFormAssignees.assessmentForm;
  }

  async listAssessmentGroups(options?: ListOptions): Promise<PaginatedResponse<AssessmentGroup>> {
    const query = `
      query ListAssessmentGroups($first: Int) {
        assessmentGroups(first: $first) {
          nodes {
            id
            title
            assessmentFormTemplate {
              id
              title
            }
          }
          totalCount
        }
      }
    `;
    const data = await this.makeRequest<{
      assessmentGroups: { nodes: AssessmentGroup[]; totalCount: number };
    }>(query, { first: Math.min(options?.first || 50, 100) });
    return {
      nodes: data.assessmentGroups.nodes,
      pageInfo: {
        hasNextPage: data.assessmentGroups.nodes.length < data.assessmentGroups.totalCount,
        hasPreviousPage: false,
      },
      totalCount: data.assessmentGroups.totalCount,
    };
  }

  async createAssessmentGroup(input: {
    title: string;
    assessmentFormTemplateId: string;
    description?: string;
    isTriggerEnabled?: boolean;
    reviewerIds?: string[];
  }): Promise<{ id: string; title: string }> {
    const mutation = `
      mutation CreateAssessmentGroup($input: CreateAssessmentGroupInput!) {
        createAssessmentGroup(input: $input) {
          assessmentGroup {
            id
            title
          }
        }
      }
    `;
    const data = await this.makeRequest<{
      createAssessmentGroup: { assessmentGroup: { id: string; title: string } };
    }>(mutation, { input });
    return data.createAssessmentGroup.assessmentGroup;
  }

  async createAssessment(input: AssessmentCreateInput): Promise<Assessment> {
    const mutation = `
      mutation CreateAssessmentForms($input: CreateAssessmentFormsInput!) {
        createAssessmentForms(input: $input) {
          assessmentForms {
            id
            title
            status
            createdAt
          }
        }
      }
    `;
    const batchInput = {
      assessmentForms: [
        {
          title: input.title,
          assessmentGroupId: input.assessmentGroupId,
          ...(input.assigneeIds && { assigneeIds: input.assigneeIds }),
        },
      ],
    };
    const data = await this.makeRequest<{
      createAssessmentForms: { assessmentForms: Assessment[] };
    }>(mutation, { input: batchInput });
    const created = data.createAssessmentForms.assessmentForms[0];
    if (!created) throw new Error('createAssessmentForms returned an empty array');
    return created;
  }

  async updateAssessment(input: AssessmentUpdateInput): Promise<Assessment> {
    const mutation = `
      mutation UpdateAssessmentForm($input: UpdateAssessmentFormInput!) {
        updateAssessmentForm(input: $input) {
          assessmentForm {
            id
            title
            description
            status
            dueDate
            updatedAt
          }
        }
      }
    `;
    const data = await this.makeRequest<{ updateAssessmentForm: { assessmentForm: Assessment } }>(
      mutation,
      { input },
    );
    return data.updateAssessmentForm.assessmentForm;
  }

  async listAssessmentTemplates(
    options?: ListOptions,
  ): Promise<PaginatedResponse<AssessmentTemplate>> {
    const query = `
      query ListAssessmentTemplates($first: Int) {
        assessmentFormTemplates(first: $first) {
          nodes {
            id
            title
            description
          }
          totalCount
        }
      }
    `;
    const data = await this.makeRequest<{
      assessmentFormTemplates: {
        nodes: Array<{ id: string; title: string; description: string | null }>;
        totalCount: number;
      };
    }>(query, { first: Math.min(options?.first || 50, 100) });
    const templates: AssessmentTemplate[] = data.assessmentFormTemplates.nodes.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description || undefined,
      version: '1.0.0',
      isActive: true,
      createdAt: new Date().toISOString(),
    }));
    return {
      nodes: templates,
      pageInfo: {
        hasNextPage:
          data.assessmentFormTemplates.nodes.length < data.assessmentFormTemplates.totalCount,
        hasPreviousPage: false,
      },
      totalCount: data.assessmentFormTemplates.totalCount,
    };
  }

  async submitAssessmentForReview(input: AssessmentSubmitForReviewInput): Promise<Assessment> {
    const mutation = `
      mutation SubmitAssessmentFormForReview($input: SubmitAssessmentFormForReviewInput!) {
        submitAssessmentFormForReview(input: $input) {
          clientMutationId
        }
      }
    `;
    await this.makeRequest<{ submitAssessmentFormForReview: { clientMutationId?: string } }>(
      mutation,
      { input },
    );
    return this.getAssessment(input.id);
  }

  async createAssessmentFormTemplate(
    input: AssessmentTemplateCreateInput,
  ): Promise<{ id: string; title: string; status: string }> {
    const mutation = `
      mutation CreateAssessmentFormTemplate($input: CreateAssessmentFormTemplateInput!) {
        createAssessmentFormTemplate(input: $input) {
          assessmentFormTemplate {
            id
            title
            status
            sections {
              id
              title
              index
              questions {
                id
                title
                index
                type
                subType
                referenceId
              }
            }
          }
        }
      }
    `;
    const gqlInput: Record<string, unknown> = {
      title: input.title,
      description: input.description || '',
      status: input.status || 'DRAFT',
      source: input.source || 'MANUAL',
    };
    if (input.sections) {
      gqlInput.sections = input.sections.map((s) => ({
        title: s.title,
        questions: s.questions?.map(normalizeQuestion) || [],
      }));
    }
    const data = await this.makeRequest<{
      createAssessmentFormTemplate: {
        assessmentFormTemplate: {
          id: string;
          title: string;
          status: string;
          sections: Array<{
            id: string;
            title: string;
            index: number;
            questions: Array<{
              id: string;
              title: string;
              index: number;
              type: string;
              subType: string;
              referenceId: string;
            }>;
          }>;
        };
      };
    }>(mutation, { input: gqlInput });
    return data.createAssessmentFormTemplate.assessmentFormTemplate;
  }

  async createAssessmentSection(input: {
    assessmentFormTemplateId: string;
    title: string;
    questions?: AssessmentQuestionInput[];
  }): Promise<{ id: string; title: string; index: number }> {
    const mutation = `
      mutation CreateAssessmentSection($input: CreateAssessmentSectionInput!) {
        createAssessmentSection(input: $input) {
          assessmentSection {
            id
            title
            index
            questions {
              id
              title
              index
              type
              subType
              referenceId
            }
          }
        }
      }
    `;
    const gqlInput: Record<string, unknown> = {
      assessmentFormTemplateId: input.assessmentFormTemplateId,
      title: input.title,
    };
    if (input.questions) {
      gqlInput.questions = input.questions.map(normalizeQuestion);
    }
    const data = await this.makeRequest<{
      createAssessmentSection: {
        assessmentSection: {
          id: string;
          title: string;
          index: number;
          questions: Array<{
            id: string;
            title: string;
            index: number;
            type: string;
            subType: string;
            referenceId: string;
          }>;
        };
      };
    }>(mutation, { input: gqlInput });
    return data.createAssessmentSection.assessmentSection;
  }

  async createAssessmentQuestions(
    assessmentSectionId: string,
    questions: AssessmentQuestionInput[],
  ): Promise<
    Array<{
      id: string;
      title: string;
      index: number;
      type: string;
      subType: string;
      referenceId: string;
    }>
  > {
    const mutation = `
      mutation CreateAssessmentQuestions($input: [CreateAssessmentQuestionInput!]!) {
        createAssessmentQuestions(input: $input) {
          assessmentQuestions {
            id
            title
            index
            type
            subType
            referenceId
          }
        }
      }
    `;
    const input = questions.map((q) => ({
      title: q.title,
      type: q.type,
      subType: q.subType || 'NONE',
      placeholder: q.placeholder || '',
      description: q.description || '',
      isRequired: q.isRequired ?? false,
      referenceId: q.referenceId,
      assessmentSectionId,
      answerOptions: q.answerOptions || [],
      allowSelectOther: q.allowSelectOther ?? false,
      requireRiskEvaluation: q.requireRiskEvaluation ?? false,
    }));
    const data = await this.makeRequest<{
      createAssessmentQuestions: {
        assessmentQuestions: Array<{
          id: string;
          title: string;
          index: number;
          type: string;
          subType: string;
          referenceId: string;
        }>;
      };
    }>(mutation, { input });
    return data.createAssessmentQuestions.assessmentQuestions;
  }

  async getAssessmentFormTemplate(templateId: string): Promise<AssessmentTemplateExport> {
    const query = `
      query GetAssessmentFormTemplate($ids: [ID!]) {
        assessmentFormTemplates(first: 1, filterBy: { ids: $ids }) {
          nodes {
            id
            title
            description
            status
            source
            createdAt
            updatedAt
            sections {
              id
              title
              index
              questions {
                id
                title
                index
                type
                subType
                description
                placeholder
                isRequired
                referenceId
                allowSelectOther
                requireRiskEvaluation
                answerOptions {
                  id
                  index
                  value
                }
              }
            }
          }
        }
      }
    `;
    const data = await this.makeRequest<{
      assessmentFormTemplates: { nodes: AssessmentTemplateExport[] };
    }>(query, { ids: [templateId] });
    const node = data.assessmentFormTemplates.nodes[0];
    if (!node) {
      throw new Error(`Assessment template with id ${templateId} not found`);
    }
    return node;
  }
}
