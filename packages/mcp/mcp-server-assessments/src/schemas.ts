import { z, PaginationSchema } from '@transcend-io/mcp-server-core';

export const AssessmentStatusEnum = z.enum([
  'DRAFT',
  'SHARED',
  'IN_PROGRESS',
  'IN_REVIEW',
  'CHANGES_REQUESTED',
  'REJECTED',
  'APPROVED',
]);

export const ListAssessmentsSchema = z
  .object({
    status: AssessmentStatusEnum.optional(),
  })
  .merge(PaginationSchema);

export const GetAssessmentSchema = z.object({
  assessment_id: z.string(),
});

export const CreateAssessmentSchema = z.object({
  title: z.string(),
  assessment_group_id: z.string().optional(),
  template_id: z.string().optional(),
  assignee_ids: z.array(z.string()).optional(),
});

export const CreateGroupSchema = z.object({
  title: z.string(),
  template_id: z.string(),
  description: z.string().optional(),
  reviewer_ids: z.array(z.string()).optional(),
});

export const ListGroupsSchema = PaginationSchema;

export const UpdateAssessmentSchema = z.object({
  assessment_id: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  reviewer_ids: z.array(z.string()).optional(),
  due_date: z.string().optional(),
  status: AssessmentStatusEnum.optional(),
});

export const ListTemplatesSchema = PaginationSchema;

export const UpdateAssigneesSchema = z.object({
  assessment_id: z.string(),
  assignee_ids: z.array(z.string()).optional(),
  external_assignee_emails: z.array(z.string()).optional(),
});

export const AnswerQuestionSchema = z.object({
  assessment_question_id: z.string(),
  assessment_answer_ids: z.array(z.string()).optional(),
  assessment_answer_values: z
    .array(z.object({ value: z.string(), isUserCreated: z.boolean() }))
    .optional(),
});

export const SubmitResponseSchema = z.object({
  assessment_id: z.string(),
  assessment_section_ids: z.array(z.string()),
});

export const CreateTemplateSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
  sections: z.array(z.record(z.string(), z.unknown())).optional(),
});

export const AddSectionSchema = z.object({
  template_id: z.string(),
  title: z.string(),
  questions: z.array(z.record(z.string(), z.unknown())).optional(),
});

export const ExportTemplateSchema = z.object({
  template_id: z.string(),
});

export const PrefillSchema = z.object({
  title: z.string(),
  template_id: z.string().optional(),
  assessment_group_id: z.string().optional(),
  answers: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
  assignee_ids: z.array(z.string()).optional(),
  assignee_emails: z.array(z.string()).optional(),
  reviewer_ids: z.array(z.string()).optional(),
  submit_for_review: z.boolean().optional(),
});

export type ListAssessmentsInput = z.infer<typeof ListAssessmentsSchema>;
export type GetAssessmentInput = z.infer<typeof GetAssessmentSchema>;
export type CreateAssessmentInput = z.infer<typeof CreateAssessmentSchema>;
export type CreateGroupInput = z.infer<typeof CreateGroupSchema>;
export type ListGroupsInput = z.infer<typeof ListGroupsSchema>;
export type UpdateAssessmentInput = z.infer<typeof UpdateAssessmentSchema>;
export type ListTemplatesInput = z.infer<typeof ListTemplatesSchema>;
export type UpdateAssigneesInput = z.infer<typeof UpdateAssigneesSchema>;
export type AnswerQuestionInput = z.infer<typeof AnswerQuestionSchema>;
export type SubmitResponseInput = z.infer<typeof SubmitResponseSchema>;
export type CreateTemplateInput = z.infer<typeof CreateTemplateSchema>;
export type AddSectionInput = z.infer<typeof AddSectionSchema>;
export type ExportTemplateInput = z.infer<typeof ExportTemplateSchema>;
export type PrefillInput = z.infer<typeof PrefillSchema>;
