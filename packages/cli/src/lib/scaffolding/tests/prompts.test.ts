import { describe, expect, it, vi } from 'vitest';

import { isInteractivePromptInvocation, resolveSetupFeatures } from '../prompts.js';

describe('scaffold prompt helpers', () => {
  it('requires human output and input streams', () => {
    const flags = { json: false, noInteractive: false };

    expect(isInteractivePromptInvocation(flags, true, true)).toBe(true);
    expect(isInteractivePromptInvocation(flags, true, false)).toBe(false);
    expect(isInteractivePromptInvocation(flags, false, true)).toBe(false);
    expect(isInteractivePromptInvocation({ ...flags, json: true }, true, true)).toBe(false);
    expect(isInteractivePromptInvocation({ ...flags, noInteractive: true }, true, true)).toBe(
      false,
    );
  });

  it('uses only explicitly enabled setup outside interactive mode', async () => {
    const checkbox = vi.fn();

    await expect(
      resolveSetupFeatures(
        { checkbox },
        {
          features: ['editor', 'ci'],
          labels: { editor: 'Editor', ci: 'CI' },
          enabled: { editor: true, ci: undefined },
          interactive: false,
        },
      ),
    ).resolves.toEqual(['editor']);
    expect(checkbox).not.toHaveBeenCalled();
  });

  it('builds a default-selected setup checklist in interactive mode', async () => {
    const checkbox = vi.fn().mockResolvedValue(['editor']);

    await expect(
      resolveSetupFeatures(
        { checkbox },
        {
          features: ['editor', 'ci'],
          labels: { editor: 'Editor', ci: 'CI' },
          enabled: { editor: undefined, ci: false },
          interactive: true,
        },
      ),
    ).resolves.toEqual(['editor']);
    expect(checkbox).toHaveBeenCalledWith('Choose repository setup:', [
      { name: 'Editor', value: 'editor', checked: true },
      { name: 'CI', value: 'ci', checked: false },
    ]);
  });
});
