import { vi, type MockedFunction } from 'vitest';

type MessageListener = (message: unknown) => unknown;
type ProcessSend = (message: unknown) => boolean;
type RegisteredMessageListener = Parameters<NodeJS.Process['removeListener']>[1];
type RunWorker = () => Promise<void>;

/**
 * Options for installing a fake worker process.
 */
export interface FakeWorkerProcessOptions {
  /** Worker identifier exposed through the process environment */
  readonly workerId?: string;
  /** Arguments exposed to worker module entrypoint checks */
  readonly argv?: readonly string[];
}

/**
 * Controls and observations for a fake worker process.
 */
export interface FakeWorkerProcessHarness {
  /** Mocked IPC send function */
  readonly send: MockedFunction<ProcessSend>;
  /** Mocked process exit function */
  readonly exit: MockedFunction<NodeJS.Process['exit']>;
  /** Start a worker and capture the message listener it registers */
  readonly start: (runWorker: RunWorker) => void;
  /** Dispatch a message to the captured worker listener */
  readonly dispatch: (message: unknown) => Promise<void>;
  /** Return messages sent to the parent process */
  readonly sentMessages: () => unknown[];
  /** Restore process state and remove worker-added listeners */
  readonly restore: () => void;
}

/**
 * Install process mocks for exercising a worker entrypoint in-process.
 *
 * @param options - Worker environment and argument overrides.
 * @returns Controls for starting, messaging, and restoring the fake worker process.
 */
export function fakeWorkerProcess(
  options: FakeWorkerProcessOptions = {},
): FakeWorkerProcessHarness {
  const originalWorkerId = process.env.WORKER_ID;
  const originalSend = process.send;
  const originalExit = process.exit;
  const originalArgv = process.argv;
  let registeredMessageListener: RegisteredMessageListener | undefined;
  let workerMessageListener: MessageListener | undefined;
  let restored = false;

  process.env.WORKER_ID = options.workerId ?? '7';
  process.argv = options.argv ? [...options.argv] : ['node', 'worker.test.js'];

  const send = vi.fn<ProcessSend>(() => true);
  const exit = vi.fn<NodeJS.Process['exit']>(() => undefined as never);
  process.send = send as NonNullable<NodeJS.Process['send']>;
  process.exit = exit;

  return {
    send,
    exit,
    start(runWorker) {
      const listenersBeforeStart = new Set(process.listeners('message'));

      // Worker loops intentionally remain pending until process shutdown.
      void runWorker();

      const addedListeners = process
        .listeners('message')
        .filter((listener) => !listenersBeforeStart.has(listener));
      registeredMessageListener = addedListeners[0] as unknown as RegisteredMessageListener;
      workerMessageListener = addedListeners[0] as MessageListener | undefined;

      if (!workerMessageListener) {
        throw new Error('Worker did not register a message listener');
      }
    },
    async dispatch(message) {
      if (!workerMessageListener) {
        throw new Error('Worker must be started before dispatching a message');
      }

      await workerMessageListener(message);
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
      });
    },
    sentMessages() {
      return send.mock.calls.map(([message]) => message);
    },
    restore() {
      if (restored) {
        return;
      }
      restored = true;

      if (registeredMessageListener) {
        process.removeListener('message', registeredMessageListener);
      }

      process.send = originalSend;
      process.exit = originalExit;
      process.argv = originalArgv;

      if (originalWorkerId === undefined) {
        delete process.env.WORKER_ID;
      } else {
        process.env.WORKER_ID = originalWorkerId;
      }
    },
  };
}
