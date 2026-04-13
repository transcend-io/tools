/**
 * An arbitrary object keyed by strings for naming consistency.
 */
export type ObjByString = { [key in string]: any };

/**
 * An arbitrary function.
 */
export type AnyFunction = (...args: any[]) => any;

/**
 * An arbitrary array.
 */
export type AnyArray = any[];

/**
 * The type of the underlying array.
 */
export type ArrType<TData extends AnyArray> = TData extends (infer DataT)[] ? DataT : never;

/**
 * The type of the underlying promise.
 */
export type PromiseType<TData> = TData extends Promise<infer Result> ? Result : TData;

/**
 * The type of the underlying array or the identity of the input.
 */
export type ArrOrIdentityType<TData> = TData extends (infer DataT)[] ? DataT : TData;

/**
 * Helper to create `T` or `T[]`.
 */
export type OrArray<T> = T | T[];

/**
 * To make the inspected type more tractable than a bunch of intersections.
 */
export type Identity<T> = {
  [K in keyof T]: T[K];
};

/**
 * Identity but recursive.
 */
export type RecursiveIdentity<T> = T extends AnyArray
  ? ArrType<T> extends object
    ? Identity<ArrType<T>>[]
    : T
  : T extends string
    ? T
    : T extends object
      ? {
          [K in keyof T]: T[K] extends object ? Identity<T[K]> : T[K];
        }
      : T;

/**
 * Make selected object keys defined by `K` optional in type `T`.
 */
export type Optionalize<T, K extends keyof T> = Identity<Omit<T, K> & Partial<T>>;

/**
 * Make selected object keys required in type `T`.
 */
export type Requirize<T, K extends keyof T> = Identity<Omit<T, K> & Required<{ [P in K]: T[P] }>>;

/**
 * Convert keys of a type to strings.
 */
export type Stringify<T, K extends keyof T> = Omit<T, K> & {
  [P in keyof T]: string;
};

/**
 * Extract string keys from an object.
 */
export type StringKeys<TObj extends ObjByString> = Extract<keyof TObj, string>;

/**
 * Extract associated values of string keys.
 */
export type StringValues<TObj extends ObjByString> = TObj[keyof TObj];

/**
 * String keys without extends enforcement.
 */
export type StringKeysSafe<T> = T extends ObjByString ? StringKeys<T> : undefined;

/**
 * Extract the sub types of an object based on a condition.
 */
export type SubType<Base, Condition> = Pick<
  Base,
  { [Key in keyof Base]: Base[Key] extends Condition ? Key : never }[keyof Base]
>;

/**
 * Inverse of `SubType`.
 */
export type SubNotType<Base, Condition> = Pick<
  Base,
  { [Key in keyof Base]: Base[Key] extends Condition ? never : Key }[keyof Base]
>;

/**
 * `SubType`, but optional inputs become required.
 */
export type SubTypeRequired<Base, Condition> = SubType<Required<Base>, Condition>;

/**
 * Names of properties in `T` with types that include `undefined`.
 */
type OptionalPropertyNames<T> = {
  [K in keyof T]: undefined extends T[K] ? K : never;
}[keyof T];

/**
 * Common properties from `L` and `R` with `undefined` in `R[K]` replaced by `L[K]`.
 */
type SpreadProperties<L, R, K extends keyof L & keyof R> = {
  [P in K]: L[P] | Exclude<R[P], undefined>;
};

/**
 * Type of `{ ...L, ...R }`, more accurate than `L & R`.
 */
export type Spread<L, R> = Identity<
  Pick<L, Exclude<keyof L, keyof R>> &
    Pick<R, Exclude<keyof R, OptionalPropertyNames<R>>> &
    Pick<R, Exclude<OptionalPropertyNames<R>, keyof L>> &
    SpreadProperties<L, R, OptionalPropertyNames<R> & keyof L>
>;

/**
 * Soft spread.
 */
export type Merge<L, R> = Identity<Pick<L, Exclude<keyof L, keyof R>> & R>;

/**
 * Convert unions to intersections.
 */
export type UnionToIntersection<U> = (U extends any ? (argument: U) => void : never) extends (
  argument: infer Intersection,
) => void
  ? Intersection
  : never;

/**
 * Loop over an object and recursively replace all values.
 */
export type RecursiveTypeReplace<T, TReplace, TReplaceWith> =
  T extends Promise<infer Result>
    ? Promise<RecursiveTypeReplace<Result, TReplace, TReplaceWith>>
    : T extends (...args: infer Args) => infer ReturnValue
      ? (...args: Args) => RecursiveTypeReplace<ReturnValue, TReplace, TReplaceWith>
      : T extends RegExp
        ? T
        : Extract<T, string> extends never
          ? { [Key in keyof T]: RecursiveTypeReplace<T[Key], TReplace, TReplaceWith> }
          :
              | Exclude<
                  {
                    [Key in keyof T]: RecursiveTypeReplace<T[Key], TReplace, TReplaceWith>;
                  },
                  string
                >
              | TReplaceWith;

/**
 * Recursively replace one type in an object.
 */
export type RecursiveObjectReplace<TBase, TReplaceCondition, TReplaceWith> =
  TBase extends TReplaceCondition
    ? TReplaceWith
    : TBase extends (infer Item)[]
      ? RecursiveObjectReplace<Item, TReplaceCondition, TReplaceWith>
      : TBase extends object
        ? {
            [Key in keyof TBase]: TBase[Key] extends (infer MatrixItem)[][]
              ? RecursiveObjectReplace<MatrixItem, TReplaceCondition, TReplaceWith>[][]
              : TBase[Key] extends (infer MatrixItem)[][] | undefined
                ?
                    | RecursiveObjectReplace<MatrixItem, TReplaceCondition, TReplaceWith>[][]
                    | undefined
                : TBase[Key] extends (infer Item)[]
                  ? RecursiveObjectReplace<Item, TReplaceCondition, TReplaceWith>[]
                  : TBase[Key] extends (infer Item)[] | undefined
                    ? RecursiveObjectReplace<Item, TReplaceCondition, TReplaceWith>[] | undefined
                    : TBase[Key] extends TReplaceCondition
                      ? TReplaceWith
                      : TBase[Key] extends TReplaceCondition | undefined
                        ? TReplaceWith | undefined
                        : RecursiveObjectReplace<TBase[Key], TReplaceCondition, TReplaceWith>;
          }
        : TBase;

/**
 * Make values nullable.
 */
export type Nullable<T> = {
  [K in keyof T]: T[K] | null;
};

/**
 * Deep partial of a type.
 */
export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

/**
 * Utility type that passes through the interface given that its keys are
 * exactly equal to the keys string union.
 */
export type KeysStrictlyEqual<
  Keys extends string,
  Interface extends [keyof Interface] extends [Keys]
    ? [Keys] extends [keyof Interface]
      ? unknown
      : never
    : never,
> = Interface;

/**
 * Override fields in `T` with fields in `U`.
 */
export type Override<T, U> = Pick<T, Exclude<keyof T, keyof U>> & U;
