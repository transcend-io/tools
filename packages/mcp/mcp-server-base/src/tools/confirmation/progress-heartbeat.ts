import { logMcpDebugEvent } from '../../debug-log.js';
import { getMcpSession } from '../../mcp-session-context.js';

/**
 * How often to tell the host a waiting call is still alive.
 *
 * Hosts that honor `resetTimeoutOnProgress` restart their per-call timer on each
 * notification. 10s leaves a wide margin under a 60s limit.
 */
export const PROGRESS_HEARTBEAT_INTERVAL_MS = 10_000;

/**
 * Sends `notifications/progress` on an interval until the returned function runs.
 *
 * A confirmation call spends its time waiting on a person, and the host counts that
 * wait against its call timeout. Progress notifications are the protocol's way to say
 * "still working". They only work when the host asked for them by sending a
 * `progressToken`; without one this does nothing.
 *
 * @param message - Human-readable status carried on each notification
 * @returns Function that stops the heartbeat
 */
export function startProgressHeartbeat(message: string): () => void {
  const request = getMcpSession()?.request;
  const progressToken = request?.progressToken;
  const sendNotification = request?.sendNotification;

  logMcpDebugEvent('progress.heartbeat.start', {
    hasProgressToken: progressToken !== undefined,
    canNotify: sendNotification !== undefined,
  });
  if (progressToken === undefined || !sendNotification) return () => undefined;

  // The spec requires `progress` to increase on every notification
  let progress = 0;
  const timer = setInterval(() => {
    progress += 1;
    sendNotification({
      method: 'notifications/progress',
      params: { progressToken, progress, message },
    }).then(
      () => logMcpDebugEvent('progress.sent', { progress }),
      (error: unknown) =>
        logMcpDebugEvent('progress.error', {
          progress,
          error: error instanceof Error ? error.message : String(error),
        }),
    );
  }, PROGRESS_HEARTBEAT_INTERVAL_MS);
  // A pending heartbeat must not keep the process alive
  timer.unref();

  return () => clearInterval(timer);
}

/**
 * Runs `work` with a progress heartbeat that stops when it settles.
 *
 * @param message - Status text for each notification
 * @param work - The waiting work to keep alive
 * @returns Whatever `work` returns
 */
export async function withProgressHeartbeat<T>(
  message: string,
  work: () => Promise<T>,
): Promise<T> {
  const stop = startProgressHeartbeat(message);
  try {
    return await work();
  } finally {
    stop();
  }
}
