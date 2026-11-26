import { buildRouteMap } from '@stricli/core';

import { buildXdiSyncEndpointCommand } from './build-xdi-sync-endpoint/command.js';
import { deletePreferenceRecordsCommand } from './delete-preference-records/command.js';
import { deployCommand } from './deploy/command.js';
import { generateAccessTokensCommand } from './generate-access-tokens/command.js';
import { previewDeployCommand } from './preview-deploy/command.js';
import { pullConsentMetricsCommand } from './pull-consent-metrics/command.js';
import { pullConsentPreferencesCommand } from './pull-consent-preferences/command.js';
import { rollbackCommand } from './rollback/command.js';
import { updateConsentManagerCommand } from './update-consent-manager/command.js';
import { uploadConsentPreferencesCommand } from './upload-consent-preferences/command.js';
import { uploadCookiesFromCsvCommand } from './upload-cookies-from-csv/command.js';
import { uploadDataFlowsFromCsvCommand } from './upload-data-flows-from-csv/command.js';
import { uploadPreferencesCommand } from './upload-preferences/command.js';

export const consentRoutes = buildRouteMap({
  routes: {
    'build-xdi-sync-endpoint': buildXdiSyncEndpointCommand,
    deploy: deployCommand,
    'generate-access-tokens': generateAccessTokensCommand,
    'pull-consent-metrics': pullConsentMetricsCommand,
    'pull-consent-preferences': pullConsentPreferencesCommand,
    'preview-deploy': previewDeployCommand,
    rollback: rollbackCommand,
    'update-consent-manager': updateConsentManagerCommand,
    'upload-consent-preferences': uploadConsentPreferencesCommand,
    'upload-cookies-from-csv': uploadCookiesFromCsvCommand,
    'upload-data-flows-from-csv': uploadDataFlowsFromCsvCommand,
    'upload-preferences': uploadPreferencesCommand,
    'delete-preference-records': deletePreferenceRecordsCommand,
  },
  docs: {
    brief: 'Consent commands',
  },
});
