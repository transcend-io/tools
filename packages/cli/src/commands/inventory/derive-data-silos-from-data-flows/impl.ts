import path from 'node:path';

import { buildTranscendGraphQLClient, fetchAndIndexCatalogs } from '@transcend-io/sdk';
import colors from 'colors';

import { DataFlowInput } from '../../../codecs.js';
import type { LocalContext } from '../../../context.js';
import { filterFileNames } from '../../../lib/api-keys/index.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { dataFlowsToDataSilos } from '../../../lib/consent-manager/dataFlowsToDataSilos.js';
import { parseTranscendYaml, serializeTranscendYaml } from '../../../lib/readTranscendYaml.js';

export interface DeriveDataSilosFromDataFlowsCommandFlags {
  auth: string;
  dataFlowsYmlFolder: string;
  dataSilosYmlFolder: string;
  ignoreYmls?: string[];
  transcendUrl: string;
}

export async function deriveDataSilosFromDataFlows(
  this: LocalContext,
  {
    auth,
    dataFlowsYmlFolder,
    dataSilosYmlFolder,
    ignoreYmls = [],
    transcendUrl,
  }: DeriveDataSilosFromDataFlowsCommandFlags,
): Promise<void> {
  doneInputValidation(this.process);

  // Ensure folder is passed
  if (
    !this.fs.existsSync(dataFlowsYmlFolder) ||
    !this.fs.lstatSync(dataFlowsYmlFolder).isDirectory()
  ) {
    this.logger.error(colors.red(`Folder does not exist: "${dataFlowsYmlFolder}"`));
    this.process.exit(1);
  }

  // Ensure folder is passed
  if (
    !this.fs.existsSync(dataSilosYmlFolder) ||
    !this.fs.lstatSync(dataSilosYmlFolder).isDirectory()
  ) {
    this.logger.error(colors.red(`Folder does not exist: "${dataSilosYmlFolder}"`));
    this.process.exit(1);
  }

  // Fetch all integrations in the catalog
  const client = buildTranscendGraphQLClient(transcendUrl, auth);
  const { serviceToTitle, serviceToSupportedIntegration } = await fetchAndIndexCatalogs(client, {
    logger: this.logger,
  });

  // List of each data flow yml file
  filterFileNames(this.fs.readdirSync(dataFlowsYmlFolder)).forEach((directory) => {
    const inputPath = path.join(dataFlowsYmlFolder, directory);

    // read in the data flows for a specific instance
    const { 'data-flows': dataFlows = [] } = parseTranscendYaml(
      this.fs.readFileSync(inputPath, 'utf8'),
      {},
      inputPath,
    );

    // map the data flows to data silos
    const { adTechDataSilos, siteTechDataSilos } = dataFlowsToDataSilos(
      dataFlows as DataFlowInput[],
      {
        serviceToSupportedIntegration,
        serviceToTitle,
      },
    );

    // combine and write to yml file
    const dataSilos = [...adTechDataSilos, ...siteTechDataSilos];
    this.logger.log(`Total Services: ${dataSilos.length}`);
    this.logger.log(`Ad Tech Services: ${adTechDataSilos.length}`);
    this.logger.log(`Site Tech Services: ${siteTechDataSilos.length}`);
    this.fs.writeFileSync(
      path.join(dataSilosYmlFolder, directory),
      serializeTranscendYaml({
        'data-silos': ignoreYmls.includes(directory) ? [] : dataSilos,
      }),
    );
  });
}
