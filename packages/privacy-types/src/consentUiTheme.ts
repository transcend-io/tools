/* eslint-disable max-lines */

import { makeEnum, valuesOf } from '@transcend-io/type-utils';
import * as t from 'io-ts';

/**
 * Types representing the consent UI theme configuration
 * Includes keys for alignment, logo position, content flow, colors, and more
 */
/**
 * Vertical alignment options for the consent UI content
 */
export const VerticalAlign = makeEnum({
  /** Aligns the UI content at the top */
  Top: 'top',
  /** Aligns the UI content at the bottom */
  Bottom: 'bottom',
  /** Aligns the UI content in the center */
  Center: 'center',
});

/** Override type */
export type VerticalAlign = (typeof VerticalAlign)[keyof typeof VerticalAlign];

/**
 * Horizontal alignment options for the consent UI content
 */
export const HorizontalAlign = makeEnum({
  /** Aligns the UI content on the left */
  Left: 'left',
  /** Aligns the UI content in the center */
  Center: 'center',
  /** Aligns the UI content on the right */
  Right: 'right',
});

/** Override type */
export type HorizontalAlign = (typeof HorizontalAlign)[keyof typeof HorizontalAlign];

/**
 * Position options for the logo in the consent UI
 */
export const LogoPosition = makeEnum({
  /** Logo is positioned above the content */
  Above: 'above',
  /** Logo is positioned to the left of the content */
  Left: 'left',
});

/** Override type */
export type LogoPosition = (typeof LogoPosition)[keyof typeof LogoPosition];

/**
 * Defines how content can flow in a layout
 */
export const ContentFlows = makeEnum({
  /** Items are stacked vertically, top to bottom */
  Vertical: 'vertical',
  /** Items are stacked horizontally, often wrapping if space runs out */
  HorizontalStacked: 'horizontal-stacked',
  /** Items are laid out horizontally, in a single row */
  HorizontalFlat: 'horizontal-flat',
});

/** Override type */
export type ContentFlows = (typeof ContentFlows)[keyof typeof ContentFlows];

/**
 * Units available for responsive breakpoints.
 */
export const BreakpointType = makeEnum({
  /** Breakpoint defined in pixels */
  Px: 'px',
  /** Breakpoint defined as a percentage */
  Percent: 'percent',
});

/** Override type */
export type BreakpointType = (typeof BreakpointType)[keyof typeof BreakpointType];

/** String that represents a CSS unit eg. px, em, etc. */
export const CssUnitString = t.string;

/** Type override */
export type CssUnitString = t.TypeOf<typeof CssUnitString>;

/**
 * String that represents an RGBA hex color (8-digit hex with alpha channel),
 * e.g. "#FFFFFFFF" (opaque white) or "#FF000080" (semi-transparent red).
 */
export const RgbaHexString = t.string;

/** Override type */
export type RgbaHexString = t.TypeOf<typeof RgbaHexString>;

/**
 * String that represents an RGB hex color (6-digit hex without alpha channel),
 * e.g. "#FFFFFF" (white) or "#000000" (black).
 */
export const RgbHexString = t.string;

/** Override type */
export type RgbHexString = t.TypeOf<typeof RgbHexString>;

/** Index of a button's theme */
export const ButtonThemeIndex = t.number;

/** Override type */
export type ButtonThemeIndex = t.TypeOf<typeof ButtonThemeIndex>;

/** Represents background color configuration */
export const Background = t.type({
  /** Background color as an RGBA hex string */
  backgroundColor: RgbaHexString,
});

/** Override type */
export type Background = t.TypeOf<typeof Background>;

/**
 * Represents border configuration
 */
export const Border = t.type({
  borderRadius: CssUnitString,
  borderColor: RgbHexString,
});

/** Override type */
export type Border = t.TypeOf<typeof Border>;

/**
 * Represents text configuration
 */
export const Text = t.type({
  textColor: RgbHexString,
});

/** Override type */
export type Text = t.TypeOf<typeof Text>;

/**
 * Represents link configuration
 */
export const Link = t.type({
  linkColor: RgbHexString,
  linkUnderline: t.boolean,
});

/** Override type */
export type Link = t.TypeOf<typeof Link>;

/**
 * Represents icon configuration
 */
export const Icon = t.type({
  iconColor: RgbHexString,
});

/** Override type */
export type Icon = t.TypeOf<typeof Icon>;

/** Represents a responsive breakpoint with value and unit */
export const Breakpoint = t.type({
  /** The numeric value of the breakpoint */
  value: t.number,
  /** The unit of the breakpoint (px or percent) */
  unit: valuesOf(BreakpointType),
});

/** Override type */
export type Breakpoint = t.TypeOf<typeof Breakpoint>;

/**
 * Represents a container theme with background and border configurations
 */
export const ContainerTheme = t.intersection([Background, Border]);

/** Override type */
export type ContainerTheme = t.TypeOf<typeof ContainerTheme>;

/** Represents the header theme configuration */
export const HeaderTheme = t.intersection([Text, t.type({ logoPosition: valuesOf(LogoPosition) })]);

/** Override type */
export type HeaderTheme = t.TypeOf<typeof HeaderTheme>;

/** Represents the configuration of the close button */
export const CloseButtonTheme = t.intersection([
  Background,
  Border,
  t.type({ iconColor: RgbHexString }),
]);

/** Override type */
export type CloseButtonTheme = t.TypeOf<typeof CloseButtonTheme>;

/** Represents the configuration of the description text */
export const DescriptionTextTheme = t.intersection([Text, Link]);

/** Override type */
export type DescriptionTextTheme = t.TypeOf<typeof DescriptionTextTheme>;

/** Represents the configuration of the footer */
export const FooterTheme = t.intersection([
  Background,
  t.type({ localePickerColor: RgbHexString }),
]);

/** Override type */
export type FooterTheme = t.TypeOf<typeof FooterTheme>;

/** Defines how content should be padded and sized at different breakpoints */
export const PaddedContentLayout = t.type({
  breakpoint: Breakpoint,
  maxWidths: t.record(valuesOf(ContentFlows), CssUnitString),
});
/** Override type */
export type PaddedContentLayout = t.TypeOf<typeof PaddedContentLayout>;

/** Defines a layout that stretches content to full width */
export const FullWidthContentLayout = t.type({
  fullWidth: t.literal(true),
});

/** Override type */
export type FullWidthContentLayout = t.TypeOf<typeof FullWidthContentLayout>;

/** Represents either a padded content layout or a full-width layout */
export const ContentLayout = t.union([PaddedContentLayout, FullWidthContentLayout]);

/** Override type */
export type ContentLayout = t.TypeOf<typeof ContentLayout>;

/** Theme configuration for the toggle */
export const ToggleTheme = t.intersection([
  Text,
  Icon,
  t.type({
    enabledColor: RgbHexString,
    disabledColor: RgbHexString,
    knobColor: RgbHexString,
  }),
]);

/** Override type */
export type ToggleTheme = t.TypeOf<typeof ToggleTheme>;

/** Theme configuration shared between both First (banner) and Second Layers (modal) */
export const CommonLayerTheme = t.intersection([
  t.type({
    buttons: t.tuple([
      ButtonThemeIndex,
      t.union([ButtonThemeIndex, t.undefined]),
      t.union([ButtonThemeIndex, t.undefined]),
    ]),
    container: ContainerTheme,
    description: DescriptionTextTheme,
    footer: FooterTheme,
    alwaysShowScrollbar: t.boolean,
    horizontalAlign: valuesOf(HorizontalAlign),
    cookieAndPrivacyPolicy: t.partial(Link.props),
  }),
  t.partial({
    background: Background,
    header: HeaderTheme,
    closeButton: CloseButtonTheme,
  }),
]);

/** Override type */
export type CommonLayerTheme = t.TypeOf<typeof CommonLayerTheme>;

/** Theme configuration for the First Layer (banner) */
export const FirstLayerTheme = t.intersection([
  CommonLayerTheme,
  t.type({
    contentFlow: valuesOf(ContentFlows),
    verticalAlign: valuesOf(VerticalAlign),
  }),
]);

/** Override type */
export type FirstLayerTheme = t.TypeOf<typeof FirstLayerTheme>;

/** Theme configuration for the Second Layer (modal) */
export const SecondLayerTheme = t.intersection([
  CommonLayerTheme,
  t.type({
    modalTitle: Text,
    modalSubtitle: Text,
    purposeListTitle: Text,
    caretIcon: Icon,
    cardTitle: Text,
    alwaysOnText: Text,
    purposeDescription: DescriptionTextTheme,
    purposeCard: ContainerTheme, // border color applies to dividers
    toggle: ToggleTheme,
    // lockToEdges is linked to horizontalAlign left/right. if left/right, this is forced to true.
    // if horizontalAlign is center and lockEdges is true then top and bottom are locked to edges
    lockToEdges: t.boolean,
    maxWidth: CssUnitString,
  }),
  t.partial({
    bulkActionButtons: t.tuple([ButtonThemeIndex, ButtonThemeIndex]),
    shrinkToFullWidth: CssUnitString,
  }),
]);

/** Override type */
export type SecondLayerTheme = t.TypeOf<typeof SecondLayerTheme>;

/** Represents a button theme which can be either a full button or a link style */
export const ButtonTheme = t.union([t.intersection([Background, Border, Text]), Link]);

/** Override type */
export type ButtonTheme = t.TypeOf<typeof ButtonTheme>;

/** Configuration shared between all themes types */
export const SharedTopLevelTheme = t.type({
  buttonThemes: t.array(ButtonTheme),
});

/** Override type */
export type SharedTopLevelTheme = t.TypeOf<typeof SharedTopLevelTheme>;

/** Banner-only theme configuration */
export const ThemeConfigurationBannerOnly = t.intersection([
  SharedTopLevelTheme,
  t.type({
    firstLayer: FirstLayerTheme,
  }),
]);

/** Override type */
export type ThemeConfigurationBannerOnly = t.TypeOf<typeof ThemeConfigurationBannerOnly>;

/** Modal-only theme configuration */
export const ThemeConfigurationModalOnly = t.intersection([
  SharedTopLevelTheme,
  t.type({
    secondLayer: SecondLayerTheme,
  }),
]);

/** Override type */
export type ThemeConfigurationModalOnly = t.TypeOf<typeof ThemeConfigurationModalOnly>;

/** Banner into modal theme configuration */
export const ThemeConfigurationBannerIntoModal = t.intersection([
  SharedTopLevelTheme,
  t.type({
    firstLayer: FirstLayerTheme,
    secondLayer: SecondLayerTheme,
  }),
]);

/** Override type */
export type ThemeConfigurationBannerIntoModal = t.TypeOf<typeof ThemeConfigurationBannerIntoModal>;

/** Union of all theme configurations */
export const ThemeConfiguration = t.union([
  ThemeConfigurationBannerOnly,
  ThemeConfigurationModalOnly,
  ThemeConfigurationBannerIntoModal,
]);

/** Override type */
export type ThemeConfiguration = t.TypeOf<typeof ThemeConfiguration>;
/* eslint-enable max-lines */
