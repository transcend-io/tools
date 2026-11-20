import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { lookUpNpmPackage } from './npm-registry.ts';

const statusByPath: Record<string, number> = {
  '/@transcend-io%2fpublished': 200,
  '/@transcend-io%2fbrand-new': 404,
  '/@transcend-io%2fflaky': 503,
};

let server: Server;
let registryUrl: string;

beforeAll(async () => {
  server = createServer((request, response) => {
    response.writeHead(statusByPath[request.url ?? ''] ?? 500).end('{}');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  registryUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

describe('lookUpNpmPackage', () => {
  it('reports a package the registry knows as found', async () => {
    expect(await lookUpNpmPackage('@transcend-io/published', registryUrl)).toEqual({
      name: '@transcend-io/published',
      outcome: 'found',
    });
  });

  it('reports a registry 404 as missing', async () => {
    expect(await lookUpNpmPackage('@transcend-io/brand-new', registryUrl)).toEqual({
      name: '@transcend-io/brand-new',
      outcome: 'missing',
    });
  });

  it('reports other HTTP statuses as errors, not missing', async () => {
    expect(await lookUpNpmPackage('@transcend-io/flaky', registryUrl)).toMatchObject({
      outcome: 'error',
      reason: expect.stringContaining('HTTP 503'),
    });
  });

  it('reports network failures as errors, not missing', async () => {
    const closedServer = createServer();
    await new Promise<void>((resolve) => closedServer.listen(0, '127.0.0.1', resolve));
    const { port } = closedServer.address() as AddressInfo;
    await new Promise((resolve) => closedServer.close(resolve));

    expect(
      await lookUpNpmPackage('@transcend-io/published', `http://127.0.0.1:${port}/`),
    ).toMatchObject({
      outcome: 'error',
      reason: expect.stringContaining('ECONNREFUSED'),
    });
  });
});
