import { existsSync, lstatSync } from 'node:fs';
import { join } from 'node:path';

import colors from 'colors';

import { DataFlowInput } from '../../../codecs.js';
import type { LocalContext } from '../../../context.js';
import { listFiles } from '../../../lib/api-keys/index.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { dataFlowsToDataSilos } from '../../../lib/consent-manager/dataFlowsToDataSilos.js';
import { fetchAndIndexCatalogs, buildTranscendGraphQLClient } from '../../../lib/graphql/index.js';
import { readTranscendYaml, writeTranscendYaml } from '../../../lib/readTranscendYaml.js';
import { logger } from '../../../logger.js';

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
  doneInputValidation(this.process.exit);

  // Ensure folder is passed
  if (!existsSync(dataFlowsYmlFolder) || !lstatSync(dataFlowsYmlFolder).isDirectory()) {
    logger.error(colors.red(`Folder does not exist: "${dataFlowsYmlFolder}"`));
    this.process.exit(1);
  }

  // Ensure folder is passed
  if (!existsSync(dataSilosYmlFolder) || !lstatSync(dataSilosYmlFolder).isDirectory()) {
    logger.error(colors.red(`Folder does not exist: "${dataSilosYmlFolder}"`));
    this.process.exit(1);
  }

  // Fetch all integrations in the catalog
  const client = buildTranscendGraphQLClient(transcendUrl, auth);
  const { serviceToTitle, serviceToSupportedIntegration } = await fetchAndIndexCatalogs(client);

  // List of each data flow yml file
  listFiles(dataFlowsYmlFolder).forEach((directory) => {
    // read in the data flows for a specific instance
    const { 'data-flows': dataFlows = [] } = readTranscendYaml(join(dataFlowsYmlFolder, directory));

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
    logger.log(`Total Services: ${dataSilos.length}`);
    logger.log(`Ad Tech Services: ${adTechDataSilos.length}`);
    logger.log(`Site Tech Services: ${siteTechDataSilos.length}`);
    writeTranscendYaml(join(dataSilosYmlFolder, directory), {
      'data-silos': ignoreYmls.includes(directory) ? [] : dataSilos,
    });
  });
}
