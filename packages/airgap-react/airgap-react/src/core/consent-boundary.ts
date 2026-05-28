import type { AirgapAPI, TrackingPurpose } from '@transcend-io/airgap.js-types';

function getUnconsentedPurposes(
  airgap: AirgapAPI,
  purposes: Set<TrackingPurpose>,
): Set<TrackingPurpose> {
  const missingConsentPurposes = new Set<TrackingPurpose>();

  for (const purpose of purposes) {
    if (purpose === 'Unknown') {
      for (const regimePurpose of airgap.getRegimePurposes()) {
        if (!airgap.isConsented(new Set([regimePurpose]))) {
          missingConsentPurposes.add(regimePurpose);
        }
      }
    } else if (!airgap.isConsented(new Set([purpose]))) {
      missingConsentPurposes.add(purpose);
    }
  }

  return missingConsentPurposes;
}

/**
 * Resolve which tracking purposes still need consent before URLs can load.
 */
export async function getMissingConsentPurposesForUrls(
  airgap: AirgapAPI,
  urlsRequiredForRender: readonly string[],
): Promise<Set<TrackingPurpose>> {
  const missingConsentPurposes = new Set<TrackingPurpose>();

  await Promise.all(
    urlsRequiredForRender.map(async (url) => {
      if (await airgap.isAllowed(url)) return;

      const missingUrlPurposes = getUnconsentedPurposes(airgap, await airgap.getPurposes(url));

      for (const purpose of missingUrlPurposes) {
        missingConsentPurposes.add(purpose);
      }
    }),
  );

  return missingConsentPurposes;
}
