import { describe, expect, it } from 'vitest';

import { getConsentPrompts } from '../src/prompts/index.js';

const EXPECTED_PROMPT_NAMES = [
  'consent-triage',
  'consent-research-tracker',
  'consent-inspect-site',
] as const;

describe('Consent Prompts', () => {
  it('registers the three consent workflow prompts', () => {
    const prompts = getConsentPrompts();
    expect(prompts.map((prompt) => prompt.name)).toEqual([...EXPECTED_PROMPT_NAMES]);
  });

  it('substitutes triage_type and batch_size in consent-triage', async () => {
    const triage = getConsentPrompts().find((prompt) => prompt.name === 'consent-triage');
    expect(triage).toBeDefined();

    const messages = await triage!.handler({
      triage_type: 'cookies',
      batch_size: '5',
    });

    expect(messages).toHaveLength(2);
    expect(messages[0]!.content.text).toContain('Triage cookies');
    expect(messages[0]!.content.text).toContain('batch size 5');
    expect(messages[1]!.content.text).toContain('consent_get_inventory_stats');
    expect(messages[1]!.content.text).toContain('consent_cookie_triage_review_app');
    expect(messages[1]!.content.text).toContain('"triageType": "cookies"');
    expect(messages[1]!.content.text).toContain('Do **not** pre-fetch');
    expect(messages[1]!.content.text).toContain('dataFlows.needReviewCount');
    expect(messages[1]!.content.text).toContain(
      'consent_list_cookies { status: "NEEDS_REVIEW", first: 5',
    );
    expect(messages[1]!.content.text).not.toContain('consent_list_data_flows');
    expect(messages[1]!.content.text).not.toContain('"triageType": "data_flows"');
  });
});
