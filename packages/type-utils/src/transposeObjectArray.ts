/**
 * Type representing a transposed array of objects.
 */
type TransposedObjectArray<T, K extends keyof T> = {
  [P in K]: Array<T[P]>;
} & {
  /** Properties not selected for transposition. */
  rest: Array<Omit<T, K>>;
};

/**
 * Transpose an array of objects by converting selected properties into arrays
 * while keeping the remaining properties grouped in `rest`.
 */
export const transposeObjectArray = <T extends object, K extends keyof T>({
  objects,
  properties,
  options = { includeOtherProperties: true },
}: {
  /** Array of objects to transpose. */
  objects: T[];
  /** Property keys to transpose into arrays. */
  properties: K[];
  /** Options for how to transpose the array. */
  options?: {
    /** Whether to include non-transposed properties in the final result. */
    includeOtherProperties?: boolean;
  };
}): TransposedObjectArray<T, K> =>
  objects.reduce(
    (accumulator, item) => {
      const result = { ...accumulator } as TransposedObjectArray<T, K>;

      properties.forEach((property) => {
        const currentArray = (accumulator[property] || []) as T[K][];
        result[property] = [...currentArray, item[property]] as any;
      });

      const restObject = {} as Omit<T, K>;
      Object.entries(item).forEach(([key, value]) => {
        if (!properties.includes(key as K)) {
          (restObject as any)[key] = value;
        }
      });

      if (options.includeOtherProperties) {
        result.rest = [...(accumulator.rest || []), restObject];
      }

      return result;
    },
    {} as TransposedObjectArray<T, K>,
  );
