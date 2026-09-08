import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { ConsentPreferenceUpload } from '../../../lib/consent-manager/types.js';
import { uploadConsents } from '../../../lib/consent-manager/uploadConsents.js';
import { parseCsv } from '../../../lib/requests/readCsv.js';

export interface UploadConsentPreferencesCommandFlags {
  base64EncryptionKey: string;
  base64SigningKey: string;
  partition: string;
  file: string;
  consentUrl: string;
  concurrency: number;
}

export async function uploadConsentPreferences(
  this: LocalContext,
  {
    base64EncryptionKey,
    base64SigningKey,
    partition,
    file,
    consentUrl,
    concurrency,
  }: UploadConsentPreferencesCommandFlags,
): Promise<void> {
  doneInputValidation(this.process);

  // Load in preferences from csv
  const preferences = parseCsv(this.fs.readFileSync(file, 'utf8'), ConsentPreferenceUpload);

  // Upload cookies
  await uploadConsents({
    base64EncryptionKey,
    base64SigningKey,
    preferences,
    partition,
    concurrency,
    transcendUrl: consentUrl,
  });
}
