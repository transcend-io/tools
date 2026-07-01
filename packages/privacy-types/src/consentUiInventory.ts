import { LOCALE_KEY } from '@transcend-io/internationalization';
import { makeEnum, valuesOf } from '@transcend-io/type-utils';
import * as t from 'io-ts';

/** Status of a consent UI variant */
export const UiVariantStatus = makeEnum({
  /** Variant is in draft */
  Draft: 'DRAFT',
  /** Variant is active */
  Active: 'ACTIVE',
  /** Variant is published */
  Published: 'PUBLISHED',
});

/** Type override */
export type UiVariantStatus = (typeof UiVariantStatus)[keyof typeof UiVariantStatus];

/** User flow for a consent UI variant */
export const ConsentUiUserFlow = makeEnum({
  /** Banner-only flow */
  Banner: 'BANNER',
  /** Modal-only flow */
  Modal: 'MODAL',
  /** Banner and modal flow */
  BannerAndModal: 'BANNER_AND_MODAL',
});

/** Type override */
export type ConsentUiUserFlow = (typeof ConsentUiUserFlow)[keyof typeof ConsentUiUserFlow];

/** Consent UI variant input from transcend.yml */
export const ConsentVariantInput = t.intersection([
  t.type({
    /** ID of consent variant */
    id: t.string,
    /** Name of consent variant */
    name: t.string,
    /** Slug of consent variant */
    slug: t.string,
    /** Status of variant */
    status: valuesOf(UiVariantStatus),
    /** Locales of variant */
    locales: t.array(valuesOf(LOCALE_KEY)),
    /** Configuration of variant */
    configuration: t.string,
  }),
  t.partial({
    /** Description of variant */
    description: t.string,
    /** User flow of variant */
    userFlow: valuesOf(ConsentUiUserFlow),
    /** Slug of the consent UI theme associated with this variant */
    themeSlug: t.string,
  }),
]);

/** Type override */
export type ConsentVariantInput = t.TypeOf<typeof ConsentVariantInput>;

/** Consent UI theme input from transcend.yml */
export const ConsentThemeInput = t.type({
  /** ID of consent theme */
  id: t.string,
  /** Name of consent theme */
  name: t.string,
  /** Slug of consent theme */
  slug: t.string,
  /** Configuration of theme */
  configuration: t.string,
});

/** Type override */
export type ConsentThemeInput = t.TypeOf<typeof ConsentThemeInput>;
