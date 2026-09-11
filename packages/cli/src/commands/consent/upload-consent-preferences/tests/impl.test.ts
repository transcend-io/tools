import fs from 'node:fs';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildContextForTest } from '../../../../lib/tests/helpers/buildContextForTest.js';
import { uploadConsentPreferences, type UploadConsentPreferencesCommandFlags } from '../impl.js';

const mocks = vi.hoisted(() => ({
  uploadConsents: vi.fn(),
}));

vi.mock('../../../../lib/consent-manager/uploadConsents.js', () => ({
  uploadConsents: mocks.uploadConsents,
}));

const readFileSync = vi.fn(
  () => 'userId,timestamp,confirmed\nuser-1,2026-09-05T00:00:00.000Z,true\n',
);
const context = buildContextForTest({
  env: { DEVELOPMENT_MODE_VALIDATE_ONLY: 'false' },
  fs: {
    ...fs,
    readFileSync: readFileSync as unknown as typeof fs.readFileSync,
  },
});

const flags: UploadConsentPreferencesCommandFlags = {
  base64EncryptionKey: 'encryption-key',
  base64SigningKey: 'signing-key',
  partition: 'partition',
  file: '/tmp/preferences.csv',
  consentUrl: 'https://consent.example.com',
  concurrency: 5,
};

describe('uploadConsentPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    context.reset();
    readFileSync.mockReturnValue(
      'userId,timestamp,confirmed\nuser-1,2026-09-05T00:00:00.000Z,true\n',
    );
    mocks.uploadConsents.mockResolvedValue(undefined);
  });

  it('reads and parses preferences through the command context', async () => {
    await uploadConsentPreferences.call(context, flags);

    expect(readFileSync).toHaveBeenCalledWith('/tmp/preferences.csv', 'utf8');
    expect(mocks.uploadConsents).toHaveBeenCalledWith({
      base64EncryptionKey: 'encryption-key',
      base64SigningKey: 'signing-key',
      preferences: [
        {
          userId: 'user-1',
          timestamp: '2026-09-05T00:00:00.000Z',
          confirmed: 'true',
        },
      ],
      partition: 'partition',
      concurrency: 5,
      transcendUrl: 'https://consent.example.com',
    });
    expect(context.exit).not.toHaveBeenCalled();
  });
});
