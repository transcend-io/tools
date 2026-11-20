import { ActionItemCode } from '@transcend-io/privacy-types';

import { normalizeTranscendInput, type TranscendInput } from '../codecs.js';
import { TR_YML_RESOURCE_TO_FIELD_NAME } from '../constants.js';
import { TranscendPullResource } from '../enums.js';
import { isPlainObject } from './compare.js';
import { RESOURCE_DEFINITIONS } from './resourceDefinitions.js';
import type { PlainObject } from './types.js';

/** What to pull so a push can be compared against the organization */
export interface SnapshotRequest {
  /** Resources to pull */
  resources: TranscendPullResource[];
  /** Only pull data silos with these titles. Undefined pulls all of them. */
  dataSiloTitles?: string[];
  /** Skip datapoints because the file does not define any */
  skipDatapoints: boolean;
  /** Skip sub-datapoints because the file does not define any fields */
  skipSubDatapoints: boolean;
  /** Action item types to pull. Push matches every type, so pull every type. */
  actionItemTypes?: ActionItemCode[];
}

const asItems = (value: unknown): PlainObject[] =>
  Array.isArray(value) ? value.filter(isPlainObject) : [];

/**
 * Work out the smallest pull that covers everything a push of this file touches.
 *
 * @param input - The parsed transcend.yml
 * @returns Pull options for the remote snapshot
 */
export function buildSnapshotRequest(input: TranscendInput): SnapshotRequest {
  const local = normalizeTranscendInput(input);
  const present = new Set(
    Object.entries(local)
      .filter(([, value]) => value !== undefined)
      .map(([key]) => key),
  );

  const resources = new Set<TranscendPullResource>();
  Object.entries(TR_YML_RESOURCE_TO_FIELD_NAME).forEach(([resource, key]) => {
    const definition = RESOURCE_DEFINITIONS[key as keyof typeof RESOURCE_DEFINITIONS];
    if (present.has(key) && definition?.kind !== 'pullOnly') {
      resources.add(resource as TranscendPullResource);
    }
  });

  // Push creates identifiers and data subjects that are referenced but missing
  const referencesIdentifiers =
    present.has('preflights') || present.has('identifiers') || present.has('data-silos');
  if (referencesIdentifiers) {
    resources.add(TranscendPullResource.Identifiers);
  }
  if (
    referencesIdentifiers ||
    present.has('data-subjects') ||
    present.has('processing-activities')
  ) {
    resources.add(TranscendPullResource.DataSubjects);
  }

  const silos = asItems(local['data-silos']);
  const datapoints = silos.flatMap((silo) => asItems(silo.datapoints));
  return {
    resources: [...resources],
    dataSiloTitles: silos.length > 0 ? silos.map((silo) => String(silo.title)) : undefined,
    skipDatapoints: datapoints.length === 0,
    skipSubDatapoints: !datapoints.some((datapoint) => asItems(datapoint.fields).length > 0),
    actionItemTypes: present.has('action-items') ? Object.values(ActionItemCode) : undefined,
  };
}
