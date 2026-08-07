import { describe, expect, it } from 'vitest';

import {
  ASSUME_CAPABILITIES_ENV_VAR,
  DEV_VIEWS_ENV_VAR,
  inspectorEnvArgs,
} from './lib/mcp-app-dev.ts';

describe('inspectorEnvArgs', () => {
  it('passes each variable through as an Inspector option, and only once set', () => {
    // The proxy drops anything not passed this way, so a rebuilt view would never
    // reach the host. Exact match: the override stays absent until asked for.
    expect(inspectorEnvArgs({ [DEV_VIEWS_ENV_VAR]: '1' })).toEqual([
      '-e',
      `${DEV_VIEWS_ENV_VAR}=1`,
    ]);
    expect(
      inspectorEnvArgs({
        [DEV_VIEWS_ENV_VAR]: '1',
        [ASSUME_CAPABILITIES_ENV_VAR]: 'MCP_APP',
      }),
    ).toEqual(['-e', `${DEV_VIEWS_ENV_VAR}=1`, '-e', `${ASSUME_CAPABILITIES_ENV_VAR}=MCP_APP`]);
  });

  it('omits a variable set to the empty string', () => {
    // The Inspector rejects `KEY=` outright, failing the launch rather than the
    // variable.
    expect(inspectorEnvArgs({ [DEV_VIEWS_ENV_VAR]: '' })).toEqual([]);
  });

  it('never carries credentials into the command line', () => {
    // Arguments are readable by anyone on the machine. `--http` is the path for a
    // server that needs the API.
    expect(inspectorEnvArgs({ TRANSCEND_API_KEY: 'secret', [DEV_VIEWS_ENV_VAR]: '1' })).toEqual([
      '-e',
      `${DEV_VIEWS_ENV_VAR}=1`,
    ]);
  });
});
