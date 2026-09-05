import { expect, describe, it } from 'vitest';

import { parseAttributesFromString } from '../index.js';

const dependencies = {
  logger: {
    debug: (): void => undefined,
    error: (): void => undefined,
    info: (): void => undefined,
    log: (): void => undefined,
    warn: (): void => undefined,
  },
};

describe('parseAttributesFromString', () => {
  it('should successfully split a single string to length 1', () => {
    expect(
      parseAttributesFromString(['key:value1;value2', 'key2:value3'], dependencies),
    ).to.deep.equal([
      {
        key: 'key',
        values: ['value1', 'value2'],
      },
      {
        key: 'key2',
        values: ['value3'],
      },
    ]);
  });

  it('throw an error for invalid file', () => {
    expect(() =>
      parseAttributesFromString(['keyvalue1;value2', 'key2:value3'], dependencies),
    ).to.throw('Expected attributes in key:value1;value2,key2:value3;value4');
  });

  it('throw an error for invalid codec', () => {
    expect(() => parseAttributesFromString(['key:'], dependencies)).to.throw(
      'Expected attributes in key:value1;value2,key2:value3;value4',
    );
  });
});
