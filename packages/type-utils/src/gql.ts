/**
 * Identify whether a string looks like a GraphQL interface/type/input
 * declaration.
 */
export const INTERFACE_REGEX = /(interface|type|input) [a-zA-Z0-9]* (implements .+?|){([\s\S]+?)}/;

/**
 * A `gql` is simply a string branded with the associated GraphQL type.
 */
export type Gql<TGraphQLType extends object> = string & {
  /** The TypeScript type definition that relates to the gql string. */
  graphQLType: TGraphQLType;
};

/**
 * Template tag for GraphQL fragments with a small amount of interpolation
 * support for interface bodies.
 */
export function gql<TGraphQLType extends object>(
  strings: TemplateStringsArray,
  ...expressions: (string | number)[]
): Gql<TGraphQLType> {
  if (expressions.length === 0) {
    return strings[0] as Gql<TGraphQLType>;
  }

  const count = strings.length - 1;
  let result = '';
  for (let index = 0; index < count; index += 1) {
    const expression = expressions[index]!;
    const text = typeof expression === 'string' ? expression : expression.toString();
    const useExpression = INTERFACE_REGEX.test(text)
      ? (INTERFACE_REGEX.exec(text) || [])[3]
      : expression;
    result += (strings[index] ?? '') + (useExpression ?? '');
  }

  result += strings[count] ?? '';
  return result as Gql<TGraphQLType>;
}
