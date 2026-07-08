import * as t from 'io-ts';

/**
 * Creates a default value for an `io-ts` codec.
 */
export const createDefaultCodec = <C extends t.Mixed>(codec: C): t.TypeOf<C> => {
  if (codec instanceof t.UnionType) {
    const arrayType = codec.types.find((type: any) => type instanceof t.ArrayType);
    if (arrayType) {
      return createDefaultCodec(arrayType);
    }

    const objectType = codec.types.find(
      (type: any) =>
        type instanceof t.InterfaceType ||
        type instanceof t.PartialType ||
        type instanceof t.IntersectionType ||
        type instanceof t.ArrayType,
    );
    if (objectType) {
      return createDefaultCodec(objectType);
    }

    const hasNull = codec.types.some(
      (type: any) => type instanceof t.NullType || type.name === 'null',
    );
    if (hasNull) {
      return null as t.TypeOf<C>;
    }

    return createDefaultCodec(codec.types[0]);
  }

  if (codec instanceof t.InterfaceType || codec instanceof t.PartialType) {
    const defaults: Record<string, any> = {};
    Object.entries(codec.props).forEach(([key, type]) => {
      defaults[key] = createDefaultCodec(type as any);
    });
    return defaults as t.TypeOf<C>;
  }

  if (codec instanceof t.IntersectionType) {
    return codec.types.reduce(
      (accumulator: t.TypeOf<C>, type: any) => ({
        ...accumulator,
        ...createDefaultCodec(type),
      }),
      {},
    );
  }

  if (codec instanceof t.ArrayType) {
    const elementType = codec.type;
    const isObjectType =
      elementType instanceof t.InterfaceType ||
      elementType instanceof t.PartialType ||
      elementType instanceof t.IntersectionType;

    return (isObjectType ? [createDefaultCodec(elementType)] : []) as t.TypeOf<C>;
  }

  if (codec instanceof t.LiteralType) {
    return codec.value as t.TypeOf<C>;
  }

  if (codec instanceof t.ObjectType) {
    return {} as t.TypeOf<C>;
  }

  switch (codec.name) {
    case 'string':
      return '' as t.TypeOf<C>;
    case 'number':
      return 0 as t.TypeOf<C>;
    case 'boolean':
      return false as t.TypeOf<C>;
    case 'null':
      return null as t.TypeOf<C>;
    case 'undefined':
      return undefined as t.TypeOf<C>;
    default:
      return null as t.TypeOf<C>;
  }
};
