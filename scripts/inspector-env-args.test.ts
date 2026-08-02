import { describe, expect, it } from 'vitest';

import {
  ASSUME_CAPABILITIES_ENV_VAR,
  DEV_VIEWS_ENV_VAR,
  inspectorEnvArgs,
} from './lib/mcp-app-dev.ts';

describe('inspectorEnvArgs', () => {
  it('passes each variable through as an Inspector option, and only once set', () => {
    // Without this the Inspector's proxy drops the variables and the server
    // serves each view as it was inlined at build time, so a rebuild never
    // reaches the host.
    // Exact rather than partial: the capability override is absent until
    // something asks for it, since forcing it on would mask a real negotiation
    // failure.
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
    // The Inspector rejects `KEY=` outright rather than ignoring it, which would
    // fail the launch instead of the variable.
    expect(inspectorEnvArgs({ [DEV_VIEWS_ENV_VAR]: '' })).toEqual([]);
  });

  it('never carries credentials into the command line', () => {
    // Arguments are readable by anyone on the machine, so secrets stay out of
    // them; `--http` is the path for a server that needs to call the API.
    expect(inspectorEnvArgs({ TRANSCEND_API_KEY: 'secret', [DEV_VIEWS_ENV_VAR]: '1' })).toEqual([
      '-e',
      `${DEV_VIEWS_ENV_VAR}=1`,
    ]);
  });
});
