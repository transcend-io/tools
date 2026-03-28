import { LOCALE_KEY } from '@transcend-io/internationalization';
import { makeEnum, valuesOf } from '@transcend-io/type-utils';
import * as t from 'io-ts';

/** Actions for buttons in modals */
export const ModalButtonActions = makeEnum({
  SaveAndClose: 'SaveAndClose',
  AcceptAllAndClose: 'AcceptAllAndClose',
  RejectAllAndClose: 'RejectAllAndClose',
});

/** Type override */
export type ModalButtonActions = (typeof ModalButtonActions)[keyof typeof ModalButtonActions];

/** All action types for buttons */
export const ButtonAction = makeEnum({
  ...ModalButtonActions,
  OpenModal: 'OpenModal',
});

/** Type override */
export type ButtonAction = (typeof ButtonAction)[keyof typeof ButtonAction];

/** Button Type */
export const ButtonType = makeEnum({
  Default: 'default',
  Link: 'link',
});

/** Type override */
export type ButtonType = (typeof ButtonType)[keyof typeof ButtonType];

/** Absolute URL string */
export const AbsoluteUrlString = t.string;

/** Type override */
export type AbsoluteUrlString = t.TypeOf<typeof AbsoluteUrlString>;

/** Top-level configuration shared between the UI layers */
export const SharedTopLevelConfig = t.type({
  /** Supported locales */
  locales: t.array(valuesOf(LOCALE_KEY)),
  /** The transcend URL where the transcend logo links to */
  transcendUrl: AbsoluteUrlString,
  /** The default locale to use - must be one of the supported locales */
  defaultLocale: valuesOf(LOCALE_KEY),
});

/** Type override */
export type SharedTopLevelConfig = t.TypeOf<typeof SharedTopLevelConfig>;

/** Button configuration */
export const ButtonConfig = t.type({
  type: valuesOf(ButtonType),
  action: valuesOf(ButtonAction),
});

/** Type override */
export type ButtonConfig = t.TypeOf<typeof ButtonConfig>;

/** Configuration for buttons in modals */
export const ModalButtonConfig = t.type({
  type: valuesOf(ButtonType),
  action: valuesOf(ModalButtonActions),
});

/** Type override */
export type ModalButtonConfig = t.TypeOf<typeof ModalButtonConfig>;

/** Footer configuration */
export const FooterConfig = t.type({
  showTranscendBadge: t.boolean,
  showGpcDetected: t.boolean,
  showLocalePicker: t.boolean,
});

/** Type override */
export type FooterConfig = t.TypeOf<typeof FooterConfig>;

/** Common configuration for both first and second layers */
export const CommonLayerConfig = t.intersection([
  t.type({
    showCloseButton: t.boolean,
  }),
  t.partial({
    logoImageUrl: AbsoluteUrlString,
    alphaMask: t.boolean,
    footer: FooterConfig,
    links: t.array(AbsoluteUrlString),
  }),
]);

/** Type override */
export type CommonLayerConfig = t.TypeOf<typeof CommonLayerConfig>;

/** First layer configuration: Banner */
export const FirstLayerConfig = t.intersection([
  CommonLayerConfig,
  t.type({
    buttons: t.tuple([
      ButtonConfig,
      t.union([ButtonConfig, t.undefined]),
      t.union([ButtonConfig, t.undefined]),
    ]),
  }),
  t.partial({
    showHeader: t.boolean,
  }),
]);

/** Type override */
export type FirstLayerConfig = t.TypeOf<typeof FirstLayerConfig>;

/** Second layer configuration: Modal */
export const SecondLayerConfig = t.intersection([
  CommonLayerConfig,
  t.type({
    buttons: t.tuple([
      ModalButtonConfig,
      t.union([ModalButtonConfig, t.undefined]),
      t.union([ModalButtonConfig, t.undefined]),
    ]),
    showBulkActions: t.boolean,
    closeAfterBulkAction: t.boolean,
    showPurposeDescriptions: t.boolean,
    showCookiesLink: t.literal(false),
    showVendorsLink: t.literal(false),
    showToggleText: t.boolean,
    showToggleIcon: t.boolean,
  }),
]);

/** Type override */
export type SecondLayerConfig = t.TypeOf<typeof SecondLayerConfig>;

/** --- Top-level UI Configuration --- */
/** Banner only configuration */
export const UIConfigurationBannerOnly = t.intersection([
  SharedTopLevelConfig,
  t.type({
    firstLayerConfig: FirstLayerConfig,
  }),
]);

/** Type override */
export type UIConfigurationBannerOnly = t.TypeOf<typeof UIConfigurationBannerOnly>;

/** Modal only configuration */
export const UIConfigurationModalOnly = t.intersection([
  SharedTopLevelConfig,
  t.type({
    secondLayerConfig: SecondLayerConfig,
  }),
]);

/** Type override */
export type UIConfigurationModalOnly = t.TypeOf<typeof UIConfigurationModalOnly>;

/** Banner into modal configuration */
export const UIConfigurationBannerIntoModal = t.intersection([
  SharedTopLevelConfig,
  t.type({
    firstLayerConfig: FirstLayerConfig,
    secondLayerConfig: SecondLayerConfig,
  }),
]);

/** Type override */
export type UIConfigurationBannerIntoModal = t.TypeOf<typeof UIConfigurationBannerIntoModal>;

/** Configuration of the entire consent UI */
export const UIConfiguration = t.union([
  UIConfigurationBannerOnly,
  UIConfigurationModalOnly,
  UIConfigurationBannerIntoModal,
]);

/** Type override */
export type UIConfiguration = t.TypeOf<typeof UIConfiguration>;
