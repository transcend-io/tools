import { describe, expect, it } from 'vitest';

import type { CustomFunction } from '../fetchAllCustomFunctions.js';
import { resolveEffectiveSombraId, resolveExistingCustomFunction } from '../syncCustomFunction.js';

/**
 * Build a minimal custom function node for resolution tests
 *
 * @param id - Custom function ID
 * @param name - Custom function name
 * @returns A custom function node
 */
function customFunction(id: string, name: string): CustomFunction {
  return {
    id,
    name,
    type: 'GENERAL',
    lifecycleState: 'ACTIVE',
    signedCodeJwt: 'a.b.c',
    signedCodeContextJwt: 'a.b.c',
    hasPendingDraft: false,
  };
}

describe('resolveExistingCustomFunction', () => {
  const existing = [
    customFunction('id-1', 'Unique Name'),
    customFunction('id-2', 'Duplicated Name'),
    customFunction('id-3', 'Duplicated Name'),
  ];

  it('matches by id when provided', () => {
    expect(resolveExistingCustomFunction(existing, { id: 'id-3', name: 'anything' })?.id).toBe(
      'id-3',
    );
  });

  it('throws when the id does not exist', () => {
    expect(() =>
      resolveExistingCustomFunction(existing, { id: 'id-404', name: 'My Function' }),
    ).toThrow('no custom function with that ID exists');
  });

  it('matches by unique name when no id is provided', () => {
    expect(resolveExistingCustomFunction(existing, { name: 'Unique Name' })?.id).toBe('id-1');
  });

  it('returns undefined for an unknown name (create path)', () => {
    expect(resolveExistingCustomFunction(existing, { name: 'Brand New' })).toBeUndefined();
  });

  it('throws for an ambiguous name and lists the candidate ids', () => {
    expect(() => resolveExistingCustomFunction(existing, { name: 'Duplicated Name' })).toThrow(
      /Multiple custom functions are named "Duplicated Name".*id-2, id-3/s,
    );
  });
});

describe('resolveEffectiveSombraId', () => {
  it('prefers the config sombraId', () => {
    expect(
      resolveEffectiveSombraId(
        { name: 'Fn', sombraId: 'sombra-a' },
        { id: 'id-1', sombraId: 'sombra-a' },
        'sombra-default',
      ),
    ).toBe('sombra-a');
  });

  it('falls back to the existing function gateway', () => {
    expect(
      resolveEffectiveSombraId(
        { name: 'Fn' },
        { id: 'id-1', sombraId: 'sombra-b' },
        'sombra-default',
      ),
    ).toBe('sombra-b');
  });

  it('falls back to the default when creating without a pinned gateway', () => {
    expect(resolveEffectiveSombraId({ name: 'Fn' }, undefined, 'sombra-default')).toBe(
      'sombra-default',
    );
  });

  it('returns undefined (primary gateway) when nothing specifies one', () => {
    expect(
      resolveEffectiveSombraId({ name: 'Fn' }, { id: 'id-1', sombraId: null }),
    ).toBeUndefined();
  });

  it('throws when the config pins a different gateway than the existing function', () => {
    expect(() =>
      resolveEffectiveSombraId(
        { name: 'Fn', sombraId: 'sombra-a' },
        { id: 'id-1', sombraId: 'sombra-b' },
      ),
    ).toThrow(/cannot move a custom function between gateways/);
  });
});
