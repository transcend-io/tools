/** Public integration guide URLs on docs.transcend.io (signed-in catalog docs stay separate). */
export const INTEGRATION_PUBLIC_GUIDE_PATHS: Record<string, readonly string[]> = {
  amazonDynamodb: ['/docs/integrations/amazon/configuring-dynamodb-for-dsr-automation'],
  amazonS3: [
    '/docs/integrations/amazon/amazon-s3-plugins-configuration',
    '/docs/integrations/amazon/s3-integrations',
  ],
  amazonWebServices: [
    '/docs/integrations/amazon/aws-integration',
    '/docs/integrations/amazon/connecting-multiple-aws-services',
    '/docs/integrations/amazon/index',
    '/docs/integrations/amazon/scanning-aws-data-systems',
    '/docs/integrations/amazon/scanning-for-aws-services-with-system-discovery',
  ],
  awsOrganizations: ['/docs/integrations/amazon/aws-organization-integration'],
  azureCosmosDb: [
    '/docs/integrations/azurecosmosdb/azurecosmosdb-set-up-for-dsr-automation',
    '/docs/integrations/azurecosmosdb/index',
  ],
  cron: ['/docs/integrations/custom/cron-job-integration'],
  database: [
    '/docs/integrations/custom/database-integration-security-considerations',
    '/docs/integrations/custom/database-integration-set-up-for-dsr-automation',
    '/docs/integrations/custom/database-integration-throughput',
    '/docs/integrations/custom/database-integration',
    '/docs/integrations/custom/structured-discovery-configuration-for-databases',
  ],
  databricks: [
    '/docs/integrations/databricks/databricks-integration-set-up-for-dsr-automation',
    '/docs/integrations/databricks/databricks-integration',
    '/docs/integrations/databricks/index',
  ],
  databricksLakehouse: [
    '/docs/integrations/databricks/structured-discovery-configuration-for-databricks-integration',
  ],
  dotdigital: ['/docs/integrations/dotdigital-integration'],
  elasticsearch: [
    '/docs/integrations/elasticsearch/elasticsearch-integration-set-up-for-dsr-automation',
    '/docs/integrations/elasticsearch/index',
  ],
  firebase: [
    '/docs/integrations/google/firebase-integration',
    '/docs/integrations/google/firebase-plugins-configuration',
  ],
  googleAnalytics: ['/docs/integrations/google/data-connection-google-analytics'],
  googleBigQuery: [
    '/docs/integrations/google/google-cloud-and-big-query-platform-integration',
    '/docs/integrations/google/plugin-configuration-for-google-cloud-and-bigquery',
  ],
  googleBigtable: ['/docs/integrations/google/google-bigtable-set-up-for-dsr-automation'],
  googleCloud: [
    '/docs/integrations/google/google-cloud-and-big-query-platform-integration',
    '/docs/integrations/google/index',
    '/docs/integrations/google/plugin-configuration-for-google-cloud-and-bigquery',
  ],
  googleWorkspace: ['/docs/integrations/google/google-suite-integrations'],
  hubSpot: ['/docs/integrations/hubspot-integration'],
  looker: ['/docs/integrations/google/looker-integration'],
  mongoDb: [
    '/docs/integrations/mongodb/index',
    '/docs/integrations/mongodb/mongodb-integration-set-up-for-dsr-automation',
    '/docs/integrations/mongodb/mongodb-integration',
    '/docs/integrations/mongodb/mongodb-plugins-configuration',
  ],
  quickbase: [
    '/docs/integrations/quickbase/index',
    '/docs/integrations/quickbase/quickbase-integration-set-up-for-dsr-automation',
  ],
  salesforce: [
    '/docs/integrations/salesforce/data-discovery-with-salesforce',
    '/docs/integrations/salesforce/index',
    '/docs/integrations/salesforce/salesforce-integration-set-up-for-dsr-automation',
    '/docs/integrations/salesforce/salesforce-integration',
  ],
  server: ['/docs/integrations/custom/server-webhook-integration'],
  slack: ['/docs/integrations/slack-integration'],
  snowflake: [
    '/docs/integrations/snowflake-integration',
    '/docs/integrations/snowflake-native-app',
  ],
  tableau: [
    '/docs/integrations/tableau/index',
    '/docs/integrations/tableau/tableau-integration-set-up-for-dsr-automation',
    '/docs/integrations/tableau/tableau-pre-flight-enrichment-for-dsr-automation',
  ],
  teradata: ['/docs/integrations/custom/teradata-integration'],
  trino: ['/docs/integrations/trino-integration'],
  workday: ['/docs/integrations/workday-integration'],
};

export const INTEGRATION_PRIMARY_GUIDE_URL: Record<string, string> = {
  amazonDynamodb:
    'https://docs.transcend.io/docs/integrations/amazon/configuring-dynamodb-for-dsr-automation',
  amazonS3: 'https://docs.transcend.io/docs/integrations/amazon/amazon-s3-plugins-configuration',
  amazonWebServices: 'https://docs.transcend.io/docs/integrations/amazon/aws-integration',
  awsOrganizations:
    'https://docs.transcend.io/docs/integrations/amazon/aws-organization-integration',
  azureCosmosDb:
    'https://docs.transcend.io/docs/integrations/azurecosmosdb/azurecosmosdb-set-up-for-dsr-automation',
  cron: 'https://docs.transcend.io/docs/integrations/custom/cron-job-integration',
  database:
    'https://docs.transcend.io/docs/integrations/custom/database-integration-security-considerations',
  databricks:
    'https://docs.transcend.io/docs/integrations/databricks/databricks-integration-set-up-for-dsr-automation',
  databricksLakehouse:
    'https://docs.transcend.io/docs/integrations/databricks/structured-discovery-configuration-for-databricks-integration',
  dotdigital: 'https://docs.transcend.io/docs/integrations/dotdigital-integration',
  elasticsearch:
    'https://docs.transcend.io/docs/integrations/elasticsearch/elasticsearch-integration-set-up-for-dsr-automation',
  firebase: 'https://docs.transcend.io/docs/integrations/google/firebase-integration',
  googleAnalytics:
    'https://docs.transcend.io/docs/integrations/google/data-connection-google-analytics',
  googleBigQuery:
    'https://docs.transcend.io/docs/integrations/google/google-cloud-and-big-query-platform-integration',
  googleBigtable:
    'https://docs.transcend.io/docs/integrations/google/google-bigtable-set-up-for-dsr-automation',
  googleCloud:
    'https://docs.transcend.io/docs/integrations/google/google-cloud-and-big-query-platform-integration',
  googleWorkspace: 'https://docs.transcend.io/docs/integrations/google/google-suite-integrations',
  hubSpot: 'https://docs.transcend.io/docs/integrations/hubspot-integration',
  looker: 'https://docs.transcend.io/docs/integrations/google/looker-integration',
  mongoDb: 'https://docs.transcend.io/docs/integrations/mongodb/index',
  quickbase: 'https://docs.transcend.io/docs/integrations/quickbase/index',
  salesforce:
    'https://docs.transcend.io/docs/integrations/salesforce/data-discovery-with-salesforce',
  server: 'https://docs.transcend.io/docs/integrations/custom/server-webhook-integration',
  slack: 'https://docs.transcend.io/docs/integrations/slack-integration',
  snowflake: 'https://docs.transcend.io/docs/integrations/snowflake-integration',
  tableau: 'https://docs.transcend.io/docs/integrations/tableau/index',
  teradata: 'https://docs.transcend.io/docs/integrations/custom/teradata-integration',
  trino: 'https://docs.transcend.io/docs/integrations/trino-integration',
  workday: 'https://docs.transcend.io/docs/integrations/workday-integration',
};

/** Whether a docs_list URL belongs to a published integration guide for this integrationName. */
export function docEntryMatchesIntegration(docUrl: string, integrationName: string): boolean {
  const prefixes = INTEGRATION_PUBLIC_GUIDE_PATHS[integrationName];
  if (!prefixes?.length) {
    return false;
  }
  const normalized = docUrl.replace(/\.md$/i, '');
  return prefixes.some((prefix) => normalized.includes(prefix));
}
