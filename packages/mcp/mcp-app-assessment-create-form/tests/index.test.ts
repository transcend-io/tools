import { describe, expect, it } from 'vitest';

import {
  ASSESSMENT_CREATE_FORM_RESOURCE_URI,
  createAssessmentCreateFormResource,
} from '../src/index.js';

describe('createAssessmentCreateFormResource', () => {
  it('exposes the assessment create form MCP App resource metadata', () => {
    const resource = createAssessmentCreateFormResource();

    expect(resource.uri).toBe(ASSESSMENT_CREATE_FORM_RESOURCE_URI);
    expect(resource.uri).toBe('ui://transcend/assessments/create-form');
    expect(resource.name).toBe('Assessment Create Form');
    expect(resource.description).toContain('Confirm title');
    expect(resource.loadHtml).toBeTypeOf('function');
  });
});
