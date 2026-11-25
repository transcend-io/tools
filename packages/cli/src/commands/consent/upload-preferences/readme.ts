import { buildExamples } from '../../../lib/docgen/buildExamples.js';
import type { UploadPreferencesCommandFlags } from './impl.js';

const examples = buildExamples<UploadPreferencesCommandFlags>(
  ['consent', 'upload-preferences'],
  [
    {
      description:
        'Upload consent preferences to partition key `4d1c5daa-90b7-4d18-aa40-f86a43d2c726`',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        directory: './examples/pm-test',
        partition: '4d1c5daa-90b7-4d18-aa40-f86a43d2c726',
      },
    },
    {
      description: 'Upload consent preferences with additional options',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        partition: '4d1c5daa-90b7-4d18-aa40-f86a43d2c726',
        directory: './examples/pm-test',
        dryRun: true,
        skipWorkflowTriggers: true,
        skipConflictUpdates: true,
        isSilent: false,
        attributes: 'Tags:transcend-cli,Source:transcend-cli',
        receiptFileDir: './receipts',
      },
    },
    {
      description: 'Run the interactive column mapping before uploading',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        partition: '4d1c5daa-90b7-4d18-aa40-f86a43d2c726',
        directory: './examples/pm-test',
        regenerate: true,
      },
    },
    {
      description: 'Specifying the backend URL, needed for US hosted backend infrastructure',
      flags: {
        auth: '$TRANSCEND_API_KEY',
        partition: '4d1c5daa-90b7-4d18-aa40-f86a43d2c726',
        directory: './examples/pm-test',
        transcendUrl: 'https://api.us.transcend.io',
      },
    },
  ],
);

export default `A sample CSV can be found [here](./examples/cli-upload-preferences-example.csv). In this example, \`Sales\` and \`Marketing\` are two custom Purposes, and \`SalesCommunications\` and \`MarketingCommunications\` are Preference Topics.

Before uploading, run \`transcend consent configure-preference-upload\` (or pass \`--regenerate\`) to map these columns to the identifiers, purposes, and preference topics stored in Transcend. The mapping is saved to a config file and reused on later runs.

#### Examples

${examples}`;
