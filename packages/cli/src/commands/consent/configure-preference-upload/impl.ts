import { PersistedState } from '@transcend-io/persisted-state';
import { buildTranscendGraphQLClient, FileFormatState, loadReferenceData } from '@transcend-io/sdk';
import colors from 'colors';
import inquirer from 'inquirer';
import * as t from 'io-ts';

import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { collectCsvFilesOrExit } from '../../../lib/helpers/collectCsvFilesOrExit.js';
import {
  parsePreferenceIdentifiersFromCsv,
  parsePreferenceFileFormatFromCsv,
  parsePreferenceAndPurposeValuesFromCsv,
} from '../../../lib/preference-management/index.js';
import { readCsv } from '../../../lib/requests/index.js';
import { computeSchemaFile } from '../upload-preferences/artifacts/index.js';
import { buildSyntheticRows, scanCsvFiles } from './helpers.js';

export interface ConfigurePreferenceUploadFlags {
  auth: string;
  sombraAuth?: string;
  transcendUrl: string;
  directory: string;
  schemaFilePath?: string;
  partition: string;
}

/**
 * Interactively configure the column mapping for preference CSV uploads.
 *
 * Scans ALL CSV files in a directory, discovers every header and unique value,
 * then walks the user through mapping identifiers, timestamps,
 * purpose/preference value mappings, and metadata columns.
 * Saves the result as a reusable config.
 *
 * @param flags - CLI flags
 */
export async function configurePreferenceUpload(
  this: LocalContext,
  flags: ConfigurePreferenceUploadFlags,
): Promise<void> {
  const { auth, transcendUrl, directory, schemaFilePath } = flags;

  const files = collectCsvFilesOrExit(directory, this);
  doneInputValidation(this.process);

  this.logger.info(
    colors.green(`Scanning ${files.length} CSV file(s) for headers and unique values...`),
  );

  // 1) Scan all files to discover the full column/value universe
  const { headers, uniqueValuesByColumn } = await scanCsvFiles(files, this);
  this.logger.info(colors.green(`Discovered ${headers.length} columns across all files.`));

  // 2) Fetch org reference data
  const client = buildTranscendGraphQLClient(transcendUrl, auth);
  const { purposes, preferenceTopics, identifiers } = await loadReferenceData(client, {
    logger: this.logger,
  });

  const allIdentifierNames = identifiers.map((id) => id.name);
  this.logger.info(
    colors.green(
      `Loaded ${purposes.length} purposes, ${preferenceTopics.length} preference topics, ${identifiers.length} identifiers from org.`,
    ),
  );

  // 3) Create or load persisted schema state
  const schemaFile = computeSchemaFile(schemaFilePath, directory, files[0]);
  const initial = {
    columnToPurposeName: {},
    lastFetchedAt: new Date().toISOString(),
    columnToIdentifier: {},
  } as const;
  const schemaState = new PersistedState(schemaFile, FileFormatState, initial);

  // 4) Interactive: select identifier columns
  this.logger.info(colors.green('\n[Step 1/6] Identifier column selection...'));
  const existingIdentifierCols = Object.keys(schemaState.getValue('columnToIdentifier'));
  let identifierColumns: string[];
  if (existingIdentifierCols.length > 0) {
    this.logger.info(
      colors.magenta(`Existing identifier columns: ${existingIdentifierCols.join(', ')}`),
    );
    const { reuse } = await inquirer.prompt<{ reuse: boolean }>([
      {
        name: 'reuse',
        type: 'confirm',
        message: `Keep existing identifier column selection? (${existingIdentifierCols.join(
          ', ',
        )})`,
        default: true,
      },
    ]);
    identifierColumns = reuse
      ? existingIdentifierCols
      : (
          await inquirer.prompt<{ cols: string[] }>([
            {
              name: 'cols',
              type: 'checkbox',
              message: 'Select columns that are identifiers',
              choices: headers,
              validate: (v: string[]) => v.length > 0 || 'Select at least one identifier column',
            },
          ])
        ).cols;
  } else {
    identifierColumns = (
      await inquirer.prompt<{ cols: string[] }>([
        {
          name: 'cols',
          type: 'checkbox',
          message: 'Select columns that are identifiers',
          choices: headers,
          validate: (v: string[]) => v.length > 0 || 'Select at least one identifier column',
        },
      ])
    ).cols;
  }

  // 5) Map identifier columns to org identifier names
  this.logger.info(
    colors.green(`\n[Step 2/6] Identifier name mapping (validating sample: ${files[0]})...`),
  );
  const sampleRows = readCsv(files[0], t.record(t.string, t.string));
  await parsePreferenceIdentifiersFromCsv(sampleRows, {
    schemaState,
    orgIdentifiers: identifiers,
    allowedIdentifierNames: allIdentifierNames,
    identifierColumns,
  });

  const identifierCols = Object.keys(schemaState.getValue('columnToIdentifier'));

  // 6) Select timestamp column (only needs column names, not full rows)
  this.logger.info(colors.green('\n[Step 3/6] Timestamp column selection...'));
  const timestampChoices = headers.filter((h) => !identifierCols.includes(h));
  await parsePreferenceFileFormatFromCsv(
    [
      Object.fromEntries(
        timestampChoices.map((h) => [h, [...(uniqueValuesByColumn[h] ?? [])][0] ?? '']),
      ),
    ],
    schemaState,
  );

  // 7) Select which remaining columns map to purposes/preferences
  this.logger.info(colors.green('\n[Step 4/6] Purpose/preference column selection...'));
  const timestampCol = schemaState.getValue('timestampColumn');
  const mappedSoFar = [...identifierCols, ...(timestampCol ? [timestampCol] : [])];
  const remainingColumns = headers.filter((h) => !mappedSoFar.includes(h));

  const { purposeColumns } = await inquirer.prompt<{
    purposeColumns: string[];
  }>([
    {
      name: 'purposeColumns',
      type: 'checkbox',
      message: 'Select columns that map to purposes/preferences',
      choices: remainingColumns,
      validate: (v: string[]) => v.length > 0 || 'Select at least one purpose column',
    },
  ]);

  const nonPurposeColumns = remainingColumns.filter((h) => !purposeColumns.includes(h));

  // 8) Build synthetic rows driven ONLY by purpose column unique values
  this.logger.info(colors.green('\n[Step 5/6] Mapping purpose values...'));
  const syntheticRows = buildSyntheticRows(headers, uniqueValuesByColumn, purposeColumns);
  this.logger.info(
    colors.green(
      `  Built ${syntheticRows.length} synthetic rows ` +
        `(from ${purposeColumns.length} purpose columns).`,
    ),
  );

  // 9) Map purpose columns to org purposes + value mappings
  await parsePreferenceAndPurposeValuesFromCsv(syntheticRows, schemaState, {
    purposeSlugs: purposes.map((p) => p.trackingType),
    preferenceTopics,
    forceTriggerWorkflows: false,
    columnsToIgnore: nonPurposeColumns,
  });

  // 10) Metadata: select which remaining columns to INCLUDE as metadata
  this.logger.info(colors.green('\n[Step 6/6] Metadata column selection...'));
  if (nonPurposeColumns.length > 0) {
    this.logger.info(
      colors.magenta('\nRemaining unmapped columns:\n' + `  ${nonPurposeColumns.join(', ')}\n`),
    );

    const { metadataColumns } = await inquirer.prompt<{
      metadataColumns: string[];
    }>([
      {
        name: 'metadataColumns',
        type: 'checkbox',
        message: 'Select columns to INCLUDE as metadata ' + '(unselected columns will be ignored)',
        choices: nonPurposeColumns,
      },
    ]);

    const ignored = nonPurposeColumns.filter((c) => !metadataColumns.includes(c));

    if (ignored.length > 0) {
      schemaState.setValue(ignored, 'columnsToIgnore');
    }

    if (metadataColumns.length > 0) {
      const columnToMetadata: Record<string, { key: string }> = {};
      for (const col of metadataColumns) {
        columnToMetadata[col] = { key: col };
      }
      schemaState.setValue(columnToMetadata, 'columnToMetadata');
    }

    this.logger.info(
      colors.green(
        `  Metadata: ${metadataColumns.length > 0 ? metadataColumns.join(', ') : '(none)'}`,
      ),
    );
    this.logger.info(
      colors.green(`  Ignored: ${ignored.length > 0 ? ignored.join(', ') : '(none)'}`),
    );
  }

  // 11) Validate completeness
  const purposeCols = Object.keys(schemaState.getValue('columnToPurposeName'));
  const ignoredCols = schemaState.getValue('columnsToIgnore') ?? [];
  const metadataCols = Object.keys(schemaState.getValue('columnToMetadata') ?? {});
  const allMapped = new Set([
    ...identifierCols,
    ...purposeCols,
    ...ignoredCols,
    ...metadataCols,
    ...(timestampCol ? [timestampCol] : []),
  ]);
  const unmapped = headers.filter((h) => !allMapped.has(h));
  if (unmapped.length > 0) {
    this.logger.warn(
      colors.yellow(
        `Warning: the following columns are not mapped: ${unmapped.join(', ')}. ` +
          'They will cause errors during upload. Re-run this command to fix.',
      ),
    );
  }

  schemaState.setValue(new Date().toISOString(), 'lastFetchedAt');

  this.logger.info(colors.green(`\nConfiguration saved to: ${schemaFile}`));
  this.logger.info(
    colors.green(
      `  Identifiers: ${identifierCols.join(', ')}\n` +
        `  Timestamp: ${timestampCol || '(none)'}\n` +
        `  Purpose columns: ${purposeCols.join(', ')}\n` +
        `  Metadata: ${metadataCols.join(', ') || '(none)'}\n` +
        `  Ignored: ${ignoredCols.join(', ') || '(none)'}`,
    ),
  );
}
