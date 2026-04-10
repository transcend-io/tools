/**
 * The full match returned when `regex.exec` finds a match.
 */
export interface RegExpMatch {
  /** The full regex match. */
  fullMatch: string;
  /** The index in the text where the match was found. */
  matchIndex: number;
  /** Whether the match satisfies an optional stricter regex. */
  isStrict?: boolean;
}

/**
 * Definition for finding all regex matches and mapping capture groups to keys.
 */
export interface FindAllRegExp<TMatchKeys extends string> {
  /** The regex to test. */
  value: RegExp;
  /**
   * A stricter regex used to annotate matches that satisfy a more exact
   * standard.
   */
  strict?: RegExp;
  /** Capture group names mapped by index. */
  matches: readonly TMatchKeys[];
  /** When true, skip validation of matches being the expected length. */
  skipMatchValidation?: boolean;
}

/**
 * Use a regex with the global flag to find all matches and return the list with
 * capture groups mapped to named properties.
 */
export function findAllWithRegex<TMatchKeys extends string>(
  regex: FindAllRegExp<TMatchKeys>,
  text: string,
): ({ [key in TMatchKeys]: string } & RegExpMatch)[] {
  if (!regex.value.flags.includes('g')) {
    throw new Error('Regex.value must have a g flag');
  }

  const matchParams = ['fullMatch', ...regex.matches];
  const results: ({ [key in TMatchKeys]: string } & RegExpMatch)[] = [];

  let match = regex.value.exec(text);
  let index = 0;

  while (match) {
    if (matchParams.length !== match.length && !regex.skipMatchValidation) {
      throw new Error(
        `Mismatch in match length at index [${index}]: "${match.length}" vs expected: "${matchParams.length}"`,
      );
    }

    const result = match.reduce(
      (accumulator, matchResult, matchIndex) =>
        Object.assign(accumulator, {
          [matchParams[matchIndex] as string]: matchResult,
        }),
      {},
    ) as { [key in TMatchKeys]: string } & RegExpMatch;

    result.matchIndex = match.index;

    if (regex.strict) {
      result.isStrict = regex.strict.test(result.fullMatch);
    }

    results.push(result);

    match = regex.value.exec(text);
    index += 1;
  }

  return results;
}
