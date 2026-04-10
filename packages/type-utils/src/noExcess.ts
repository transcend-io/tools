import { either, isRight, left, right, type Either, type Right } from 'fp-ts/Either';
import * as t from 'io-ts';

/**
 * Creates a type guard function that checks if a codec matches a specific tag.
 */
const getIsCodec =
  <T extends t.Any>(tag: string) =>
  (codec: t.Any): codec is T =>
    (codec as any)._tag === tag;

const isInterfaceCodec = getIsCodec<t.InterfaceType<t.Props>>('InterfaceType');
const isPartialCodec = getIsCodec<t.PartialType<t.Props>>('PartialType');

/**
 * Extract property definitions from various codec types.
 */
const getProps = (codec: t.HasProps): t.Props => {
  switch (codec._tag) {
    case 'RefinementType':
    case 'ReadonlyType':
      return getProps(codec.type);
    case 'InterfaceType':
    case 'StrictType':
    case 'PartialType':
      return codec.props;
    case 'IntersectionType':
      return codec.types.reduce<t.Props>((props, type) => Object.assign(props, getProps(type)), {});
    default:
      return {};
  }
};

/**
 * Generate a string representation of props for type naming.
 */
const getNameFromProps = (props: t.Props): string =>
  Object.keys(props)
    .map((key) => `${key}: ${props[key]!.name}`)
    .join(', ');

/**
 * Wrap a type name with `Partial<>`.
 */
const getPartialTypeName = (inner: string): string => `Partial<${inner}>`;

/**
 * Generate a human-readable type name for the no-excess wrapper.
 */
const getNoExcessTypeName = (codec: t.Any): string => {
  if (isInterfaceCodec(codec)) {
    return `{| ${getNameFromProps(codec.props)} |}`;
  }

  if (isPartialCodec(codec)) {
    return getPartialTypeName(`{| ${getNameFromProps(codec.props)} |}`);
  }

  return `Excess<${codec.name}>`;
};

/**
 * Compare an object's keys against expected properties and return either the
 * object or a list of excess keys.
 */
const stripKeys = <T = any>(obj: T, props: t.Props): Either<string[], T> => {
  const keys = Object.getOwnPropertyNames(obj);
  const propKeys = Object.getOwnPropertyNames(props);

  propKeys.forEach((propKey) => {
    const index = keys.indexOf(propKey);
    if (index !== -1) {
      keys.splice(index, 1);
    }
  });

  return keys.length ? left(keys) : right(obj);
};

/**
 * Wrap an `io-ts` codec so validation fails when excess properties are present.
 */
export const noExcess = <C extends t.HasProps>(
  codec: C,
  name: string = getNoExcessTypeName(codec),
): NoExcessType<C> => {
  const props: t.Props = getProps(codec);

  return new NoExcessType<C>(
    name,
    (value): value is C => isRight(stripKeys(value, props)) && codec.is(value),
    (value, context) =>
      either.chain(t.UnknownRecord.validate(value, context), () =>
        either.chain(codec.validate(value, context), (decoded) =>
          either.mapLeft(stripKeys<C>(decoded, props), (keys) =>
            keys.map((key) => ({
              value: decoded[key],
              context,
              message: `excess key "${key}" found`,
            })),
          ),
        ),
      ),
    (value) => codec.encode((stripKeys(value, props) as Right<any>).right),
    codec,
  );
};

/**
 * A wrapper type used with `io-ts` to ensure there are not any excess keys.
 */
export class NoExcessType<C extends t.Any, A = C['_A'], O = A, I = unknown> extends t.Type<
  A,
  O,
  I
> {
  public readonly _tag = 'NoExcessType' as const;

  public constructor(
    name: string,
    is: NoExcessType<C, A, O, I>['is'],
    validate: NoExcessType<C, A, O, I>['validate'],
    encode: NoExcessType<C, A, O, I>['encode'],
    public readonly type: C,
  ) {
    super(name, is, validate, encode);
  }
}
