import { ConsentTrackerStatus, DataFlowScope } from '@transcend-io/privacy-types';
import { decodeCodec } from '@transcend-io/type-utils';
import colors from 'colors';
import * as t from 'io-ts';

import { ConsentManagerServiceMetadata, CookieInput, DataFlowInput } from '../../../codecs.js';
import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { writeTranscendYaml } from '../../../lib/readTranscendYaml.js';

export interface ConsentManagerServiceJsonToYmlCommandFlags {
  file: string;
  output: string;
}

export function consentManagerServiceJsonToYml(
  this: LocalContext,
  { file, output }: ConsentManagerServiceJsonToYmlCommandFlags,
): void {
  doneInputValidation(this.process);

  // Ensure files exist
  if (!this.fs.existsSync(file)) {
    this.logger.error(colors.red(`File does not exist: --file="${file}"`));
    this.process.exit(1);
  }

  // Read in each consent manager configuration
  const services = decodeCodec(
    t.array(ConsentManagerServiceMetadata),
    this.fs.readFileSync(file, 'utf-8'),
  );

  // Create data flows and cookie configurations
  const dataFlows: DataFlowInput[] = [];
  const cookies: CookieInput[] = [];
  services.forEach((service) => {
    service.dataFlows
      .filter(({ type }) => type !== DataFlowScope.CSP)
      .forEach((dataFlow) => {
        dataFlows.push({
          value: dataFlow.value,
          type: dataFlow.type,
          status: ConsentTrackerStatus.Live,
          trackingPurposes: dataFlow.trackingPurposes,
        });
      });

    service.cookies.forEach((cookie) => {
      cookies.push({
        name: cookie.name,
        status: ConsentTrackerStatus.Live,
        trackingPurposes: cookie.trackingPurposes,
      });
    });
  });

  // write to disk
  writeTranscendYaml(output, {
    'data-flows': dataFlows,
    cookies,
  });

  this.logger.info(
    colors.green(
      `Successfully wrote ${dataFlows.length} data flows and ${cookies.length} cookies to file "${output}"`,
    ),
  );
}
