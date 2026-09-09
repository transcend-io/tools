/**
 * Remove CSI SGR color/style sequences so assertions can match logger output
 * whether or not the `colors` package is active (e.g. FORCE_COLOR=1).
 *
 * @param value - Text that may contain ANSI escapes
 * @returns Plain text
 */
export function stripAnsi(value: string): string {
  // eslint-disable-next-line no-control-regex -- intentional CSI match for test output
  return value.replace(/\x1B\[[0-9;]*m/g, '');
}
