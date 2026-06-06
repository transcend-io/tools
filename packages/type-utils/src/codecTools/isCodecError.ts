/**
 * Checks an error message to see if it is an `io-ts` codec error.
 */
export function isCodecError(err: Error): boolean {
  return err.message.startsWith('Failed to decode codec');
}
