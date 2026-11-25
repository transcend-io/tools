import { ConsentBundleType } from '@transcend-io/privacy-types';
import { describe, expect, it } from 'vitest';

import { orderBundleTypes } from '../orderBundleTypes.js';

describe('orderBundleTypes', () => {
  it('puts TEST before PRODUCTION', () => {
    expect(orderBundleTypes([ConsentBundleType.Production, ConsentBundleType.Test])).toEqual([
      ConsentBundleType.Test,
      ConsentBundleType.Production,
    ]);
  });

  it('removes duplicates', () => {
    expect(orderBundleTypes([ConsentBundleType.Production, ConsentBundleType.Production])).toEqual([
      ConsentBundleType.Production,
    ]);
  });
});
