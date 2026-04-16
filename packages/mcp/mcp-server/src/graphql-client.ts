import { AdminMixin } from '@transcend-io/mcp-server-admin';
import { AssessmentsMixin } from '@transcend-io/mcp-server-assessments';
import { TranscendGraphQLBase, type Logger } from '@transcend-io/mcp-server-core';
import { DiscoveryMixin } from '@transcend-io/mcp-server-discovery';
import { DSRMixin } from '@transcend-io/mcp-server-dsr';
import { InventoryMixin } from '@transcend-io/mcp-server-inventory';
import { WorkflowsMixin } from '@transcend-io/mcp-server-workflows';

type Constructor<T = object> = new (...args: [string, string?, Logger?]) => T;

function applyMixin(target: Constructor, mixin: Constructor): void {
  Object.getOwnPropertyNames(mixin.prototype).forEach((name) => {
    if (name === 'constructor') return;
    const descriptor = Object.getOwnPropertyDescriptor(mixin.prototype, name);
    if (descriptor) {
      Object.defineProperty(target.prototype, name, descriptor);
    }
  });
}

export class TranscendGraphQLClient extends TranscendGraphQLBase {
  constructor(apiKey: string, baseUrl?: string, logger?: Logger) {
    super(apiKey, baseUrl, logger);
  }

  // Admin
  declare getOrganization: InstanceType<typeof AdminMixin>['getOrganization'];
  declare getCurrentUser: InstanceType<typeof AdminMixin>['getCurrentUser'];
  declare listUsers: InstanceType<typeof AdminMixin>['listUsers'];
  declare listTeams: InstanceType<typeof AdminMixin>['listTeams'];
  declare listApiKeys: InstanceType<typeof AdminMixin>['listApiKeys'];
  declare createApiKey: InstanceType<typeof AdminMixin>['createApiKey'];
  declare getPrivacyCenter: InstanceType<typeof AdminMixin>['getPrivacyCenter'];

  // DSR
  declare listRequests: InstanceType<typeof DSRMixin>['listRequests'];
  declare getRequest: InstanceType<typeof DSRMixin>['getRequest'];
  declare cancelRequest: InstanceType<typeof DSRMixin>['cancelRequest'];

  // Inventory
  declare listDataSilos: InstanceType<typeof InventoryMixin>['listDataSilos'];
  declare getDataSilo: InstanceType<typeof InventoryMixin>['getDataSilo'];
  declare createDataSilo: InstanceType<typeof InventoryMixin>['createDataSilo'];
  declare updateDataSilo: InstanceType<typeof InventoryMixin>['updateDataSilo'];
  declare listVendors: InstanceType<typeof InventoryMixin>['listVendors'];
  declare listDataPoints: InstanceType<typeof InventoryMixin>['listDataPoints'];
  declare listSubDataPoints: InstanceType<typeof InventoryMixin>['listSubDataPoints'];
  declare listIdentifiers: InstanceType<typeof InventoryMixin>['listIdentifiers'];
  declare listDataCategories: InstanceType<typeof InventoryMixin>['listDataCategories'];

  // Consent tools now call makeRequest directly (no mixin needed)

  // Discovery
  declare listClassificationScans: InstanceType<typeof DiscoveryMixin>['listClassificationScans'];
  declare startClassificationScan: InstanceType<typeof DiscoveryMixin>['startClassificationScan'];
  declare getClassificationScan: InstanceType<typeof DiscoveryMixin>['getClassificationScan'];
  declare listDiscoveryPlugins: InstanceType<typeof DiscoveryMixin>['listDiscoveryPlugins'];

  // Assessments
  declare listAssessments: InstanceType<typeof AssessmentsMixin>['listAssessments'];
  declare getAssessment: InstanceType<typeof AssessmentsMixin>['getAssessment'];
  declare selectAssessmentQuestionAnswers: InstanceType<
    typeof AssessmentsMixin
  >['selectAssessmentQuestionAnswers'];
  declare updateAssessmentFormAssignees: InstanceType<
    typeof AssessmentsMixin
  >['updateAssessmentFormAssignees'];
  declare listAssessmentGroups: InstanceType<typeof AssessmentsMixin>['listAssessmentGroups'];
  declare createAssessmentGroup: InstanceType<typeof AssessmentsMixin>['createAssessmentGroup'];
  declare createAssessment: InstanceType<typeof AssessmentsMixin>['createAssessment'];
  declare updateAssessment: InstanceType<typeof AssessmentsMixin>['updateAssessment'];
  declare listAssessmentTemplates: InstanceType<typeof AssessmentsMixin>['listAssessmentTemplates'];
  declare submitAssessmentForReview: InstanceType<
    typeof AssessmentsMixin
  >['submitAssessmentForReview'];
  declare createAssessmentFormTemplate: InstanceType<
    typeof AssessmentsMixin
  >['createAssessmentFormTemplate'];
  declare createAssessmentSection: InstanceType<typeof AssessmentsMixin>['createAssessmentSection'];
  declare createAssessmentQuestions: InstanceType<
    typeof AssessmentsMixin
  >['createAssessmentQuestions'];
  declare getAssessmentFormTemplate: InstanceType<
    typeof AssessmentsMixin
  >['getAssessmentFormTemplate'];

  // Workflows
  declare listWorkflows: InstanceType<typeof WorkflowsMixin>['listWorkflows'];
  declare updateWorkflowConfig: InstanceType<typeof WorkflowsMixin>['updateWorkflowConfig'];
  declare listEmailTemplates: InstanceType<typeof WorkflowsMixin>['listEmailTemplates'];
}

applyMixin(TranscendGraphQLClient, AdminMixin);
applyMixin(TranscendGraphQLClient, DSRMixin);
applyMixin(TranscendGraphQLClient, InventoryMixin);
applyMixin(TranscendGraphQLClient, DiscoveryMixin);
applyMixin(TranscendGraphQLClient, AssessmentsMixin);
applyMixin(TranscendGraphQLClient, WorkflowsMixin);
