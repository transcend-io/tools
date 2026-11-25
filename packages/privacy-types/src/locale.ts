import { LOCALE_KEY } from '@transcend-io/internationalization';
import { valuesOf } from '@transcend-io/type-utils';
import * as t from 'io-ts';

/** Locale key supported by Transcend interfaces. */
export const LocaleCodec = valuesOf(LOCALE_KEY, 'Locale');

/** Locale key supported by Transcend interfaces. */
export type LocaleCodec = t.TypeOf<typeof LocaleCodec>;
