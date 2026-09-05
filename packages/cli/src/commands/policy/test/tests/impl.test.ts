import { spawn, spawnSync } from 'node:child_process';
import { EventEmitter } from 'node:events';

import { describe, expect, it, vi } from 'vitest';

import { buildContextForTest } from '../../../../lib/tests/helpers/buildContextForTest.js';
import type { PolicyDependencies } from '../../helpers/index.js';
import { test } from '../impl.js';

describe('policy test', () => {
  it('passes context-derived environment and streams to OPA', async () => {
    const context = buildContextForTest({
      env: {
        DEVELOPMENT_MODE_VALIDATE_ONLY: 'false',
        POLICY_TEST_ENV: 'test',
      },
    });
    const spawnSyncMock = vi.fn().mockReturnValue({ status: 0 });
    const spawnMock = vi.fn(() => {
      const child = new EventEmitter();
      queueMicrotask(() => child.emit('close', 0));
      return child as ReturnType<typeof spawn>;
    });
    const dependencies: Pick<PolicyDependencies, 'assertOpaInstalled' | 'runOpa'> = {
      assertOpaInstalled: {
        spawnSync: spawnSyncMock as unknown as typeof spawnSync,
        env: context.process.env,
      },
      runOpa: {
        spawn: spawnMock as unknown as typeof spawn,
        env: context.process.env,
        stdio: context.process,
      },
    };

    await test.call(context, { dir: './policies' }, dependencies);

    expect(spawnSyncMock).toHaveBeenCalledWith('opa', ['version'], {
      env: context.process.env,
      stdio: 'ignore',
    });
    expect(spawnMock).toHaveBeenCalledWith('opa', ['test', context.path.resolve('./policies')], {
      cwd: undefined,
      env: context.process.env,
      stdio: [context.process.stdin, context.process.stdout, context.process.stderr],
    });
    expect(context.stdout).toContain('Policy tests passed.');
  });
});
