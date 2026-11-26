import * as transcend from '@transcend-io/pulumi-transcend';

const minimalYaml = 'api-keys: []\n';

new transcend.Config('org-config', {
  yaml: minimalYaml,
  publishToPrivacyCenter: false,
});
