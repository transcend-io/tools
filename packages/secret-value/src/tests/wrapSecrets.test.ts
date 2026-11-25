import { wrapSecrets } from '../wrapSecrets.js';

describe(wrapSecrets, () => {
  it('wraps secrets by key name', () => {
    const obj = {
      cat: 2,
      fish: 'cow',
      moose: [2],
    };

    const secretObject = wrapSecrets(obj, ['fish']);

    expect(secretObject.cat).toBe(2);
    expect(secretObject.moose[0]).toBe(2);
    expect(secretObject.fish.release()).toBe('cow');
  });
});
