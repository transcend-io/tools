import type { CustomFunction } from '@transcend-io/custom-function-types';

/**
 * Handle a General Custom Function test payload.
 *
 * @param argument - Payload provided for the General invocation
 */
export default function customFunction({ payload }: CustomFunction.MaestroArgument): void {
  void payload;
}
