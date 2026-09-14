import type { CustomFunction } from '@transcend-io/sdk';
import { describe, expect, it } from 'vitest';

import {
  buildCustomFunctionListJsonResult,
  buildCustomFunctionPushJsonResult,
} from '../command-output.js';

describe('buildCustomFunctionListJsonResult', () => {
  it('omits signed code tokens from JSON output', () => {
    const customFunctions: CustomFunction[] = [
      {
        id: 'function-1',
        name: 'Lookup customer',
        description: 'Looks up a customer',
        type: 'GENERAL',
        lifecycleState: 'ACTIVE',
        sombraId: 'sombra-1',
        signedCodeJwt: 'preferred-code-secret',
        signedCodeContextJwt: 'preferred-context-secret',
        hasPendingDraft: false,
        activeVersion: {
          id: 'version-1',
          versionNumber: '1',
          lifecycleState: 'ACTIVE',
          signedCodeJwt: 'version-code-secret',
        },
      },
    ];

    const result = buildCustomFunctionListJsonResult(customFunctions);
    const serialized = JSON.stringify(result);

    expect(result).toMatchObject({
      version: 1,
      command: 'list',
      functions: [
        {
          id: 'function-1',
          name: 'Lookup customer',
          activeVersion: {
            id: 'version-1',
            versionNumber: '1',
          },
        },
      ],
    });
    expect(serialized).not.toContain('secret');
    expect(serialized).not.toContain('signedCode');
  });
});

describe('buildCustomFunctionPushJsonResult', () => {
  it('summarizes manifest-order outcomes and failures', () => {
    const result = buildCustomFunctionPushJsonResult('/repo/functions.yml', false, [
      {
        name: 'Created',
        result: {
          outcome: 'created',
          customFunctionId: 'function-1',
          changedFields: [],
          promoted: true,
        },
      },
      {
        name: 'Rejected',
        result: {
          outcome: 'test-failed',
          changedFields: [],
          promoted: false,
          testResults: [
            {
              passed: false,
              payloadType: 'DATA_POINT',
              result: {
                exitCode: 1,
                error: { message: 'Test failed' },
                logs: [{ file: 'stdout', message: 'sensitive-function-log' }],
                profile: { timeMs: 12 },
              },
            },
          ],
        },
      },
      {
        name: 'Failed',
        error: new Error('Gateway unavailable'),
      },
    ]);

    expect(result).toMatchObject({
      version: 1,
      command: 'push',
      status: 'failed',
      manifestPath: '/repo/functions.yml',
      dryRun: false,
      summary: {
        created: 1,
        updated: 0,
        metadataUpdated: 0,
        skipped: 0,
        rejected: 1,
        failed: 1,
      },
      functions: [
        { name: 'Created', result: { outcome: 'created' } },
        {
          name: 'Rejected',
          result: {
            outcome: 'test-failed',
            testResults: [
              {
                passed: false,
                payloadType: 'DATA_POINT',
                exitCode: 1,
                error: 'Test failed',
                timeMs: 12,
              },
            ],
          },
        },
        { name: 'Failed', error: 'Gateway unavailable' },
      ],
    });
    expect(JSON.stringify(result)).not.toContain('sensitive-function-log');
  });
});
