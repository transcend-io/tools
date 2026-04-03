import cliProgress from 'cli-progress';

/** Controls exposed to the callback inside withProgressBar */
export interface ProgressBar {
  /** Start the bar with a known total and optional initial value */
  start: (total: number, initial?: number) => void;
  /** Update the bar to the given value */
  update: (value: number) => void;
}

/**
 * Run an async operation with a cli-progress bar.
 * The bar is created once, handed to `fn` via the `bar` argument,
 * and automatically stopped when `fn` resolves (or rejects).
 *
 * @param fn - Async function that receives progress bar controls
 * @returns The value returned by `fn`
 */
export async function withProgressBar<T>(fn: (bar: ProgressBar) => Promise<T>): Promise<T> {
  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  let started = false;
  try {
    return await fn({
      start(total, initial = 0) {
        progressBar.start(total, initial);
        started = true;
      },
      update(value) {
        if (started) progressBar.update(value);
      },
    });
  } finally {
    if (started) progressBar.stop();
  }
}
