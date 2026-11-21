import type { DataSiloEnriched } from '../data-inventory/fetchEnrichedDataSilos.js';
import type { DataSiloInput } from './codecs.js';

/** GraphQL may return "" for unset optional strings; omit those from transcend.yml. */
function omitEmptyString(value: string | null | undefined): string | undefined {
  return value ? value : undefined;
}

/**
 * Inventory metadata fields on a pulled data silo that transcend.yml can round-trip on push.
 */
export function pullDataSiloInventoryFields(
  silo: Pick<
    DataSiloEnriched,
    | 'vendor'
    | 'contactName'
    | 'contactEmail'
    | 'websiteUrl'
    | 'notes'
    | 'dataRetentionNote'
    | 'dsrProcessingDocumentation'
    | 'dataProcessingAgreementLink'
    | 'dataProcessingAgreementStatus'
    | 'notifyWebhookUrl'
    | 'isPausedForDsrs'
    | 'skipSecondaryIfNoFiles'
    | 'allowDsrProcessingStartTime'
    | 'allowDsrProcessingEndTime'
    | 'customSiloConnectionStrategy'
    | 'recommendedForConsent'
    | 'recommendedForPrivacy'
    | 'hasPersonalData'
  >,
): Partial<DataSiloInput> {
  return {
    ...(silo.vendor?.title ? { 'vendor-title': silo.vendor.title } : {}),
    contactName: omitEmptyString(silo.contactName),
    contactEmail: omitEmptyString(silo.contactEmail),
    websiteUrl: omitEmptyString(silo.websiteUrl),
    notes: omitEmptyString(silo.notes),
    dataRetentionNote: omitEmptyString(silo.dataRetentionNote),
    dsrProcessingDocumentation: omitEmptyString(silo.dsrProcessingDocumentation),
    dataProcessingAgreementLink: omitEmptyString(silo.dataProcessingAgreementLink),
    ...(silo.dataProcessingAgreementStatus != null
      ? { dataProcessingAgreementStatus: silo.dataProcessingAgreementStatus }
      : {}),
    notifyWebhookUrl: omitEmptyString(silo.notifyWebhookUrl),
    ...(silo.isPausedForDsrs ? { isPausedForDsrs: true } : {}),
    ...(silo.skipSecondaryIfNoFiles ? { skipSecondaryIfNoFiles: true } : {}),
    allowDsrProcessingStartTime: omitEmptyString(silo.allowDsrProcessingStartTime),
    allowDsrProcessingEndTime: omitEmptyString(silo.allowDsrProcessingEndTime),
    ...(silo.customSiloConnectionStrategy != null
      ? { customSiloConnectionStrategy: silo.customSiloConnectionStrategy }
      : {}),
    ...(silo.recommendedForConsent != null
      ? { recommendedForConsent: silo.recommendedForConsent }
      : {}),
    ...(silo.recommendedForPrivacy != null
      ? { recommendedForPrivacy: silo.recommendedForPrivacy }
      : {}),
    ...(silo.hasPersonalData != null ? { hasPersonalData: silo.hasPersonalData } : {}),
  };
}

/**
 * Map inventory metadata from transcend.yml into UpdateDataSiloInput fields.
 *
 * @param input - Parsed data silo from transcend.yml
 * @param vendorsByTitle - Existing vendors in the org, keyed by title
 * @returns Fields to spread into each update row
 */
export function pushDataSiloInventoryFields(
  input: DataSiloInput,
  vendorsByTitle: { [title: string]: { id: string } | undefined },
): {
  vendorId?: string;
  contactName?: string;
  contactEmail?: string;
  websiteUrl?: string;
  notes?: string;
  dataRetentionNote?: string;
  dsrProcessingDocumentation?: string;
  dataProcessingAgreementLink?: string;
  dataProcessingAgreementStatus?: DataSiloEnriched['dataProcessingAgreementStatus'];
  notifyWebhookUrl?: string;
  isPausedForDsrs?: boolean;
  skipSecondaryIfNoFiles?: boolean;
  allowDsrProcessingStartTime?: string;
  allowDsrProcessingEndTime?: string;
  customSiloConnectionStrategy?: DataSiloEnriched['customSiloConnectionStrategy'];
  recommendedForConsent?: DataSiloEnriched['recommendedForConsent'];
  recommendedForPrivacy?: DataSiloEnriched['recommendedForPrivacy'];
  hasPersonalData?: DataSiloEnriched['hasPersonalData'];
  /** Set when vendor-title was provided but does not match an org vendor */
  missingVendorTitle?: string;
} {
  const vendorTitle = input['vendor-title'];
  const vendor = vendorTitle ? vendorsByTitle[vendorTitle] : undefined;

  return {
    ...(vendorTitle && vendor ? { vendorId: vendor.id } : {}),
    ...(vendorTitle && !vendor ? { missingVendorTitle: vendorTitle } : {}),
    contactName: input.contactName,
    contactEmail: input.contactEmail,
    websiteUrl: input.websiteUrl,
    notes: input.notes,
    dataRetentionNote: input.dataRetentionNote,
    dsrProcessingDocumentation: input.dsrProcessingDocumentation,
    dataProcessingAgreementLink: input.dataProcessingAgreementLink,
    dataProcessingAgreementStatus: input.dataProcessingAgreementStatus,
    notifyWebhookUrl: input.notifyWebhookUrl,
    isPausedForDsrs: input.isPausedForDsrs,
    skipSecondaryIfNoFiles: input.skipSecondaryIfNoFiles,
    allowDsrProcessingStartTime: input.allowDsrProcessingStartTime,
    allowDsrProcessingEndTime: input.allowDsrProcessingEndTime,
    customSiloConnectionStrategy: input.customSiloConnectionStrategy,
    recommendedForConsent: input.recommendedForConsent,
    recommendedForPrivacy: input.recommendedForPrivacy,
    hasPersonalData: input.hasPersonalData,
  };
}
