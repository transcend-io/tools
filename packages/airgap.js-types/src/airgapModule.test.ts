import { getValues } from '@transcend-io/type-utils';
import { describe, expect, it } from 'vitest';

import {
  AirgapModuleName,
  GvlTranslationModuleNames,
  gvlLocaleToModuleSuffix,
  IABModuleName,
  TCF_VENDOR_LIST_TRANSLATION_LOCALES,
} from './airgapModule.js';

describe('airgapModule', () => {
  it('maps GVL locale codes to PascalCase module suffixes', () => {
    expect(gvlLocaleToModuleSuffix('pt-br')).toBe('PtBr');
    expect(gvlLocaleToModuleSuffix('sr-latn')).toBe('SrLatn');
    expect(gvlLocaleToModuleSuffix('ar')).toBe('Ar');
  });

  it('exposes one GVL module name per bundled translation locale', () => {
    expect(Object.keys(GvlTranslationModuleNames)).toHaveLength(
      TCF_VENDOR_LIST_TRANSLATION_LOCALES.length,
    );
    expect(GvlTranslationModuleNames.tcfGvlSrLatn).toBe('tcfGvlSrLatn');
    expect(GvlTranslationModuleNames.tcfGvlPtBr).toBe('tcfGvlPtBr');
  });

  it('pins the full airgap module name list for GraphQL rollback and deploy clients', () => {
    expect(getValues(AirgapModuleName).sort()).toMatchSnapshot();
  });

  it('includes infrastructure modules referenced by consent rollback and deploy preview', () => {
    expect(getValues(AirgapModuleName)).toContain(IABModuleName.tcfVendorsList);
    expect(getValues(AirgapModuleName)).toContain('core');
    expect(getValues(AirgapModuleName)).toContain('tcfEn');
  });
});
