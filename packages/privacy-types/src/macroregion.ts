import { makeEnum } from '@transcend-io/type-utils';

import { IsoCountryCode } from './isoRegion.js';

/**
 * Country Code taken from https://github.com/umpirsky/country-list/blob/master/data/en/country.json
 */
export const MacroRegion = makeEnum({
  [IsoCountryCode.EU]: IsoCountryCode.EU,
});

/** Type override */
export type MacroRegion = (typeof MacroRegion)[keyof typeof MacroRegion];

export const DEFAULT_MACROREGIONS_MAP = {
  [MacroRegion.EU]: [
    IsoCountryCode.BE, // Belgium
    IsoCountryCode.GR, // Greece
    IsoCountryCode.LT, // Lithuania
    IsoCountryCode.PT, // Portugal
    IsoCountryCode.BG, // Bulgaria
    IsoCountryCode.ES, // Spain
    IsoCountryCode.LU, // Luxembourg
    IsoCountryCode.RO, // Romania
    IsoCountryCode.CZ, // Czech Republic
    IsoCountryCode.FR, // France
    IsoCountryCode.RE, // Reunion
    IsoCountryCode.GP, // Guadeloupe
    IsoCountryCode.MQ, // Martinique
    IsoCountryCode.GF, // French Guiana
    IsoCountryCode.YT, // Mayotte
    IsoCountryCode.BL, // Saint Barthelemy
    IsoCountryCode.MF, // Saint Martin
    IsoCountryCode.PM, // Saint Pierre and Miquelon
    IsoCountryCode.WF, // Wallis and Futuna
    IsoCountryCode.PF, // French Polynesia
    IsoCountryCode.NC, // New Caledonia
    IsoCountryCode.HU, // Hungary
    IsoCountryCode.SI, // Slovenia
    IsoCountryCode.DK, // Denmark
    IsoCountryCode.FO, // Faroe Islands
    IsoCountryCode.GL, // Greenland
    IsoCountryCode.HR, // Croatia
    IsoCountryCode.MT, // Malta
    IsoCountryCode.SK, // Slovakia
    IsoCountryCode.DE, // Germany
    IsoCountryCode.IT, // Italy
    IsoCountryCode.NL, // Netherlands
    IsoCountryCode.AW, // Aruba
    IsoCountryCode.CW, // Curacao
    IsoCountryCode.SX, // Sint Maarten
    IsoCountryCode.FI, // Finland
    IsoCountryCode.AX, // Aland Islands
    IsoCountryCode.EE, // Estonia
    IsoCountryCode.CY, // Cyprus
    IsoCountryCode.AT, // Austria
    IsoCountryCode.SE, // Sweden
    IsoCountryCode.IE, // Ireland
    IsoCountryCode.LV, // Latvia
    IsoCountryCode.PL, // Poland
    IsoCountryCode.AI, // Anguilla
    IsoCountryCode.BM, // Bermuda
    IsoCountryCode.IO, // British Indian Ocean Territory
    IsoCountryCode.VG, // British Virgin Islands
    IsoCountryCode.KY, // Cayman Islands
    IsoCountryCode.FK, // Falkland Islands
    IsoCountryCode.GI, // Gibraltar
    IsoCountryCode.MS, // Montserrat
    IsoCountryCode.PN, // Pitcairn, Henderson, Ducie and Oeno Islands
    IsoCountryCode.SH, // Saint Helena, Ascension and Tristan da Cunha
    IsoCountryCode.TC, // Turks and Caicos Islands
    IsoCountryCode.GG, // Guernsey
    IsoCountryCode.JE, // Jersey
    IsoCountryCode.IM, // Isle of Man
  ], // N.B. Does not include GB
};
