import type { AuthCredentials } from '@transcend-io/mcp-server-base';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { InventoryMixin } from '../src/graphql.js';

const API_KEY_AUTH: AuthCredentials = { type: 'apiKey', apiKey: 'test-api-key-12345' };

function mockFetchQueue(payloads: unknown[]) {
  let call = 0;
  return vi.fn().mockImplementation(async () => {
    const payload = payloads[Math.min(call, payloads.length - 1)];
    call += 1;
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => 'OK',
      json: async () => ({ data: payload }),
    };
  });
}

function lastRequestBody(mockFetch: ReturnType<typeof vi.fn>) {
  const [, init] = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
  return JSON.parse(init.body as string) as {
    query: string;
    variables: Record<string, unknown>;
  };
}

describe('InventoryMixin', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('getDataSilo', () => {
    it('selects vendor, purposes, owners, subjects, and metadata fields', async () => {
      const mockFetch = mockFetchQueue([
        {
          dataSilo: {
            id: 'silo-1',
            title: 'Salesforce',
            type: 'api',
            description: 'CRM',
            link: 'https://app.example/silo-1',
            isLive: true,
            outerType: null,
            createdAt: '2024-01-01T00:00:00.000Z',
            connectionState: 'CONNECTED',
            notes: 'note',
            contactName: 'Ada',
            contactEmail: 'ada@example.com',
            websiteUrl: 'https://example.com',
            country: 'US',
            countrySubDivision: 'US-CA',
            vendor: {
              id: 'v-1',
              title: 'Acme',
              description: 'Vendor',
              contactName: 'Bob',
              contactEmail: 'bob@example.com',
              websiteUrl: 'https://acme.example',
              dataProcessingAgreementLink: 'https://acme.example/dpa',
            },
            processingPurposeSubCategories: [
              { id: 'pp-1', name: '', purpose: 'ESSENTIAL', description: 'Essential' },
            ],
            owners: [{ id: 'u-1', email: 'owner@example.com', name: 'Owner' }],
            teams: [{ id: 't-1', name: 'Privacy' }],
            businessEntities: [{ id: 'be-1', title: 'Acme Corp', description: null }],
            subjects: [{ id: 'sub-1', type: 'customer', title: { defaultMessage: 'Customer' } }],
            subjectBlocklist: [],
            identifiers: [
              {
                id: 'idf-1',
                name: 'email',
                type: 'email',
                isRequiredInForm: true,
              },
            ],
          },
        },
      ]);
      vi.stubGlobal('fetch', mockFetch);

      const client = new InventoryMixin(API_KEY_AUTH);
      const result = await client.getDataSilo('silo-1');

      const body = lastRequestBody(mockFetch);
      const query = body.query.replace(/\s+/g, ' ');
      expect(query).toContain('query InventoryGetDataSilo');
      expect(query).toContain('vendor {');
      expect(query).toContain('processingPurposeSubCategories');
      expect(query).toContain('subjectBlocklist');
      expect(query).toContain('businessEntities');
      expect(body.variables).toEqual({ id: 'silo-1' });

      expect(result).toMatchObject({
        id: 'silo-1',
        notes: 'note',
        contactName: 'Ada',
        contactEmail: 'ada@example.com',
        websiteUrl: 'https://example.com',
        vendor: {
          id: 'v-1',
          title: 'Acme',
          contactEmail: 'bob@example.com',
          dataProcessingAgreementLink: 'https://acme.example/dpa',
        },
        processingPurposeSubCategories: [
          { id: 'pp-1', name: 'Other', purpose: 'ESSENTIAL', description: 'Essential' },
        ],
        owners: [{ id: 'u-1', email: 'owner@example.com', name: 'Owner' }],
        teams: [{ id: 't-1', name: 'Privacy' }],
        businessEntities: [{ id: 'be-1', title: 'Acme Corp' }],
        subjects: [{ id: 'sub-1', type: 'customer', title: 'Customer' }],
        identifiers: [{ id: 'idf-1', name: 'email', type: 'email', isRequiredInForm: true }],
      });
    });
  });

  describe('listDataPoints', () => {
    it('scopes by dataSiloId via filterBy.dataSilos', async () => {
      const mockFetch = mockFetchQueue([
        {
          dataPoints: {
            nodes: [
              {
                id: 'dp-1',
                name: 'users',
                dataSiloId: 'silo-1',
                title: { defaultMessage: 'Users' },
                description: null,
              },
            ],
            totalCount: 1,
          },
        },
      ]);
      vi.stubGlobal('fetch', mockFetch);

      const client = new InventoryMixin(API_KEY_AUTH);
      const result = await client.listDataPoints('silo-1', { first: 25, offset: 0 });

      const body = lastRequestBody(mockFetch);
      expect(body.query).toContain('filterBy: $filterBy');
      expect(body.query).toContain('dataSiloId');
      expect(body.variables).toMatchObject({
        first: 25,
        offset: 0,
        filterBy: { dataSilos: ['silo-1'] },
      });
      expect(result.nodes[0]).toMatchObject({
        id: 'dp-1',
        name: 'users',
        dataSiloId: 'silo-1',
        title: 'Users',
      });
    });

    it('omits filterBy when dataSiloId is not provided', async () => {
      const mockFetch = mockFetchQueue([
        {
          dataPoints: {
            nodes: [],
            totalCount: 0,
          },
        },
      ]);
      vi.stubGlobal('fetch', mockFetch);

      const client = new InventoryMixin(API_KEY_AUTH);
      await client.listDataPoints(undefined, { first: 10, offset: 0 });

      const body = lastRequestBody(mockFetch);
      expect(body.variables).toEqual({ first: 10, offset: 0 });
      expect(body.variables).not.toHaveProperty('filterBy');
    });
  });

  describe('listVendors', () => {
    it('maps contact, DPA, website, and createdAt fields', async () => {
      const mockFetch = mockFetchQueue([
        {
          vendors: {
            nodes: [
              {
                id: 'v-1',
                title: 'Acme',
                description: 'Vendor desc',
                dataProcessingAgreementLink: 'https://acme.example/dpa',
                contactName: 'Pat',
                contactEmail: 'pat@example.com',
                contactPhone: '+1-555-0100',
                websiteUrl: 'https://acme.example',
                address: '1 Main St',
                headquarterCountry: 'US',
                headquarterSubDivision: 'US-CA',
                createdAt: '2024-06-01T00:00:00.000Z',
              },
            ],
            totalCount: 1,
          },
        },
      ]);
      vi.stubGlobal('fetch', mockFetch);

      const client = new InventoryMixin(API_KEY_AUTH);
      const result = await client.listVendors({ first: 10, offset: 0 });

      expect(lastRequestBody(mockFetch).query).toContain('dataProcessingAgreementLink');
      expect(result.nodes[0]).toEqual({
        id: 'v-1',
        title: 'Acme',
        description: 'Vendor desc',
        dataProcessingAgreementLink: 'https://acme.example/dpa',
        contactName: 'Pat',
        contactEmail: 'pat@example.com',
        contactPhone: '+1-555-0100',
        websiteUrl: 'https://acme.example',
        address: '1 Main St',
        headquarterCountry: 'US',
        headquarterSubDivision: 'US-CA',
        createdAt: '2024-06-01T00:00:00.000Z',
      });
    });
  });

  describe('listSubDataPoints', () => {
    it('normalizes empty purpose and category subcategory names to Other', async () => {
      const mockFetch = mockFetchQueue([
        {
          subDataPoints: {
            nodes: [
              {
                id: 'sdp-1',
                name: 'email',
                description: 'Email field',
                accessRequestVisibilityEnabled: true,
                categories: [{ id: 'c-1', name: '', category: 'CONTACT' }],
                purposes: [
                  {
                    id: 'pp-1',
                    name: '   ',
                    purpose: 'ANALYTICS',
                    description: 'Analytics',
                  },
                ],
              },
            ],
            totalCount: 1,
          },
        },
      ]);
      vi.stubGlobal('fetch', mockFetch);

      const client = new InventoryMixin(API_KEY_AUTH);
      const result = await client.listSubDataPoints('dp-1', { first: 10, offset: 0 });

      expect(lastRequestBody(mockFetch).variables).toMatchObject({
        filterBy: { dataPoints: ['dp-1'] },
      });
      expect(result.nodes[0]).toMatchObject({
        name: 'email',
        categories: [{ id: 'c-1', name: 'Other', category: 'CONTACT' }],
        purposes: [{ id: 'pp-1', name: 'Other', purpose: 'ANALYTICS' }],
      });
    });
  });

  describe('listBusinessEntities', () => {
    it('maps id, title, and description', async () => {
      const mockFetch = mockFetchQueue([
        {
          businessEntities: {
            nodes: [{ id: 'be-1', title: 'Acme Corp', description: 'Parent' }],
            totalCount: 1,
          },
        },
      ]);
      vi.stubGlobal('fetch', mockFetch);

      const client = new InventoryMixin(API_KEY_AUTH);
      const result = await client.listBusinessEntities({ first: 10, offset: 0 });

      expect(result.nodes).toEqual([{ id: 'be-1', title: 'Acme Corp', description: 'Parent' }]);
    });
  });

  describe('listDataSubjects', () => {
    it('returns the full internalSubjects set with flattened titles', async () => {
      const mockFetch = mockFetchQueue([
        {
          internalSubjects: [
            {
              id: 'sub-1',
              type: 'customer',
              active: true,
              title: { defaultMessage: 'Customer' },
            },
            {
              id: 'sub-2',
              type: 'employee',
              active: false,
              title: { defaultMessage: 'Employee' },
            },
          ],
        },
      ]);
      vi.stubGlobal('fetch', mockFetch);

      const client = new InventoryMixin(API_KEY_AUTH);
      const result = await client.listDataSubjects();

      expect(lastRequestBody(mockFetch).query).toContain('internalSubjects');
      expect(result).toEqual({
        nodes: [
          { id: 'sub-1', type: 'customer', title: 'Customer', active: true },
          { id: 'sub-2', type: 'employee', title: 'Employee', active: false },
        ],
        totalCount: 2,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      });
    });
  });
});
