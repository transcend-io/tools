import { either, function as fpFunction } from 'fp-ts';
import * as t from 'io-ts';

/**
 * Determine the codec paths that are invalid.
 */
function getPaths<A>(validation: t.Validation<A>): string[] {
  return fpFunction.pipe(
    validation,
    either.fold(
      (errors) =>
        errors.map((error) => {
          const lastContext = error.context.at(-1);
          const fullPath = error.context.map(({ key }) => key).join('.');
          return `${fullPath} expected type '${lastContext?.type.name}'`;
        }),
      () => ['no errors'],
    ),
  );
}

/**
 * Get custom error messages for the errors.
 */
function getCustomErrors<A>(
  validation: t.Validation<A>,
  customErrorFromContext: (validationContext: t.Context) => string,
): string[] {
  return fpFunction.pipe(
    validation,
    either.fold(
      (errors) => errors.map((error) => customErrorFromContext(error.context)),
      () => ['no errors'],
    ),
  );
}

export const CODEC_ERROR_MESSAGE = 'Failed to decode codec:';

/**
 * Decode a codec, returning the decoded value or throwing an error.
 */
export function decodeCodec<TCodec extends t.Any>(
  codec: TCodec,
  txt: unknown,
  parse = true,
  customErrorFromContext: ((validationContext: t.Context) => string) | undefined = undefined,
): t.TypeOf<TCodec> {
  const decoded = codec.decode(parse && typeof txt === 'string' ? JSON.parse(txt) : txt);

  if (either.isLeft(decoded)) {
    const errorPaths = getPaths(decoded);
    const customError =
      customErrorFromContext !== undefined
        ? JSON.stringify(getCustomErrors(decoded, customErrorFromContext), null, 2)
        : undefined;

    throw new Error(
      `${CODEC_ERROR_MESSAGE} ${JSON.stringify(errorPaths, null, 2)}${customError ?? ''}`,
    );
  }

  return decoded.right;
}
