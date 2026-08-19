import type { AuthCredentials } from '@transcend-io/mcp-server-base';
import { DefaultPurposeSubCategoryType } from '@transcend-io/privacy-types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { InventoryMixin } from '../src/graphql.js';

const API_KEY_AUTH: AuthCredentials = { type: 'apiKey', apiKey: 'test-api-key-12345' };

function graphqlErrors(message: string) {
  return { __graphqlErrors: [{ message }] };
}

function mockFetchQueue(payloads: unknown[]) {
  let call = 0;
  return vi.fn().mockImplementation(async () => {
    const payload = payloads[Math.min(call, payloads.length - 1)];
    call += 1;
    if (payload && typeof payload === 'object' && '__graphqlErrors' in payload) {
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => 'OK',
        json: async () => ({
          data: null,
          errors: (payload as { __graphqlErrors: { message: string }[] }).__graphqlErrors,
        }),
      };
    }
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

function requestBodyAt(mockFetch: ReturnType<typeof vi.fn>, index: number) {
  const [, init] = mockFetch.mock.calls[index];
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

    it('combines dataSiloId and text in filterBy', async () => {
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
      await client.listDataPoints('silo-1', { first: 10, offset: 0, text: 'users' });

      const body = lastRequestBody(mockFetch);
      expect(body.variables).toMatchObject({
        first: 10,
        offset: 0,
        filterBy: { dataSilos: ['silo-1'], text: 'users' },
      });
    });

    it('omits filterBy when dataSiloId and text are not provided', async () => {
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

  describe('listDataSilos', () => {
    it('passes text and titles via filterBy', async () => {
      const mockFetch = mockFetchQueue([
        {
          dataSilos: {
            nodes: [],
            totalCount: 0,
          },
        },
      ]);
      vi.stubGlobal('fetch', mockFetch);

      const client = new InventoryMixin(API_KEY_AUTH);
      await client.listDataSilos({
        first: 10,
        offset: 0,
        text: 'ZEL8168',
        titles: ['Acme Silo'],
      });

      const body = lastRequestBody(mockFetch);
      expect(body.query).toContain('filterBy: $filterBy');
      expect(body.variables).toMatchObject({
        first: 10,
        offset: 0,
        filterBy: { text: 'ZEL8168', titles: ['Acme Silo'] },
      });
    });
  });

  describe('listCatalogs', () => {
    it('query includes catalogs and CatalogFiltersInput', async () => {
      const mockFetch = mockFetchQueue([
        {
          catalogs: {
            nodes: [],
            totalCount: 0,
          },
        },
      ]);
      vi.stubGlobal('fetch', mockFetch);

      const client = new InventoryMixin(API_KEY_AUTH);
      await client.listCatalogs({ first: 10, offset: 0 });

      const body = lastRequestBody(mockFetch);
      expect(body.query).toContain('catalogs(');
      expect(body.query).toContain('CatalogFiltersInput!');
      expect(body.query).toContain('integrationName');
    });

    it('empty search still sends filterBy: {}', async () => {
      const mockFetch = mockFetchQueue([
        {
          catalogs: {
            nodes: [],
            totalCount: 0,
          },
        },
      ]);
      vi.stubGlobal('fetch', mockFetch);

      const client = new InventoryMixin(API_KEY_AUTH);
      await client.listCatalogs({ first: 10, offset: 0 });

      expect(lastRequestBody(mockFetch).variables).toMatchObject({
        filterBy: {},
      });
    });

    it('passes text via filterBy.text', async () => {
      const mockFetch = mockFetchQueue([
        {
          catalogs: {
            nodes: [],
            totalCount: 0,
          },
        },
      ]);
      vi.stubGlobal('fetch', mockFetch);

      const client = new InventoryMixin(API_KEY_AUTH);
      await client.listCatalogs({ first: 10, offset: 0, text: 'salesforce' });

      expect(lastRequestBody(mockFetch).variables).toMatchObject({
        filterBy: { text: 'salesforce' },
      });
    });

    it('maps integrationName and catalog preview fields', async () => {
      const mockFetch = mockFetchQueue([
        {
          catalogs: {
            nodes: [
              {
                integrationName: 'salesforce',
                title: 'Salesforce',
                description: 'CRM platform',
                hasApiFunctionality: true,
                hasAvcFunctionality: false,
                alreadyConnected: 2,
                integrationCategory: 'SALES_AND_CRM',
              },
            ],
            totalCount: 1,
          },
        },
      ]);
      vi.stubGlobal('fetch', mockFetch);

      const client = new InventoryMixin(API_KEY_AUTH);
      const result = await client.listCatalogs({ first: 10, offset: 0 });

      expect(result.nodes[0]).toEqual({
        integrationName: 'salesforce',
        title: 'Salesforce',
        description: 'CRM platform',
        hasApiFunctionality: true,
        hasAvcFunctionality: false,
        alreadyConnected: 2,
        integrationCategory: 'SALES_AND_CRM',
      });
    });
  });

  describe('listVendors', () => {
    it('passes text via filterBy', async () => {
      const mockFetch = mockFetchQueue([
        {
          vendors: {
            nodes: [],
            totalCount: 0,
          },
        },
      ]);
      vi.stubGlobal('fetch', mockFetch);

      const client = new InventoryMixin(API_KEY_AUTH);
      await client.listVendors({ first: 10, offset: 0, text: 'Acme' });

      const body = lastRequestBody(mockFetch);
      expect(body.query).toContain('filterBy: $filterBy');
      expect(body.variables).toMatchObject({
        filterBy: { text: 'Acme' },
      });
    });

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

  describe('listProcessingPurposes', () => {
    it('normalizes blank subcategory names to Other', async () => {
      const mockFetch = mockFetchQueue([
        {
          processingPurposeSubCategories: {
            nodes: [
              { id: 'pp-1', name: '', purpose: 'LEGAL', description: 'Legal default' },
              { id: 'pp-2', name: 'Retention', purpose: 'LEGAL', description: 'Custom' },
            ],
            totalCount: 2,
          },
        },
      ]);
      vi.stubGlobal('fetch', mockFetch);

      const client = new InventoryMixin(API_KEY_AUTH);
      const result = await client.listProcessingPurposes({ first: 50, offset: 0 });

      expect(result.nodes.map((p) => p.name)).toEqual([
        DefaultPurposeSubCategoryType.Other,
        'Retention',
      ]);
    });

    it('passes text via filterBy', async () => {
      const mockFetch = mockFetchQueue([
        {
          processingPurposeSubCategories: {
            nodes: [],
            totalCount: 0,
          },
        },
      ]);
      vi.stubGlobal('fetch', mockFetch);

      const client = new InventoryMixin(API_KEY_AUTH);
      await client.listProcessingPurposes({ first: 50, offset: 0, text: 'Essential' });

      const body = lastRequestBody(mockFetch);
      expect(body.query).toContain('filterBy: $filterBy');
      expect(body.variables).toMatchObject({
        filterBy: { text: 'Essential' },
      });
    });
  });

  describe('writeProcessingPurpose', () => {
    it('treats empty API names as Other when matching upserts', async () => {
      const mockFetch = mockFetchQueue([
        {
          processingPurposeSubCategories: {
            nodes: [{ id: 'pp-1', name: '', purpose: 'ESSENTIAL', description: 'Essential' }],
            totalCount: 1,
          },
        },
        {
          updateProcessingPurposeSubCategories: {
            processingPurposeSubCategories: [
              {
                id: 'pp-1',
                name: DefaultPurposeSubCategoryType.Other,
                purpose: 'ESSENTIAL',
                description: 'Updated essential',
              },
            ],
          },
        },
      ]);
      vi.stubGlobal('fetch', mockFetch);

      const client = new InventoryMixin(API_KEY_AUTH);
      const result = await client.writeProcessingPurpose({
        name: DefaultPurposeSubCategoryType.Other,
        purpose: 'ESSENTIAL',
        description: 'Updated essential',
      });

      expect(result.created).toBe(false);
      expect(result.processingPurpose).toMatchObject({
        id: 'pp-1',
        name: DefaultPurposeSubCategoryType.Other,
        purpose: 'ESSENTIAL',
        description: 'Updated essential',
      });
      expect(mockFetch).toHaveBeenCalledTimes(2);
      const updateBody = requestBodyAt(mockFetch, 1);
      expect(updateBody.query).toContain('updateProcessingPurposeSubCategories');
    });

    it('creates when no name+purpose match exists', async () => {
      const mockFetch = mockFetchQueue([
        {
          processingPurposeSubCategories: {
            nodes: [],
            totalCount: 0,
          },
        },
        {
          createProcessingPurposeSubCategory: {
            processingPurposeSubCategory: {
              id: 'pp-new',
              name: 'Login',
              purpose: 'ESSENTIAL',
              description: 'Login flows',
            },
          },
        },
      ]);
      vi.stubGlobal('fetch', mockFetch);

      const client = new InventoryMixin(API_KEY_AUTH);
      const result = await client.writeProcessingPurpose({
        name: 'Login',
        purpose: 'ESSENTIAL',
        description: 'Login flows',
      });

      expect(result).toEqual({
        created: true,
        processingPurpose: {
          id: 'pp-new',
          name: 'Login',
          purpose: 'ESSENTIAL',
          description: 'Login flows',
        },
      });
      expect(requestBodyAt(mockFetch, 1).query).toContain('createProcessingPurposeSubCategory');
    });

    it('updates by id without listing', async () => {
      const mockFetch = mockFetchQueue([
        {
          updateProcessingPurposeSubCategories: {
            processingPurposeSubCategories: [
              {
                id: 'pp-1',
                name: 'Other',
                purpose: 'ESSENTIAL',
                description: 'By id',
              },
            ],
          },
        },
      ]);
      vi.stubGlobal('fetch', mockFetch);

      const client = new InventoryMixin(API_KEY_AUTH);
      const result = await client.writeProcessingPurpose({
        id: 'pp-1',
        description: 'By id',
      });

      expect(result.created).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(lastRequestBody(mockFetch).query).toContain('updateProcessingPurposeSubCategories');
    });
  });

  describe('listDataCategories', () => {
    it('queries dataSubCategories with optional text filter', async () => {
      const mockFetch = mockFetchQueue([
        {
          dataSubCategories: {
            nodes: [
              {
                id: 'cat-1',
                name: 'Email',
                category: 'CONTACT',
                description: 'Email address',
                owners: [{ email: 'owner@example.com' }],
                teams: [{ name: 'Privacy' }],
              },
            ],
            totalCount: 1,
          },
        },
      ]);
      vi.stubGlobal('fetch', mockFetch);

      const client = new InventoryMixin(API_KEY_AUTH);
      const result = await client.listDataCategories({ first: 50, offset: 0, text: 'Email' });

      expect(result.nodes[0]).toMatchObject({
        id: 'cat-1',
        name: 'Email',
        category: 'CONTACT',
        ownerEmails: ['owner@example.com'],
        teamNames: ['Privacy'],
      });
      expect(lastRequestBody(mockFetch).query).toContain('dataSubCategories');
      expect(lastRequestBody(mockFetch).variables).toMatchObject({
        filterBy: { text: 'Email' },
      });
    });
  });

  describe('writeDataCategory', () => {
    it('creates without listing when the subcategory is new', async () => {
      const mockFetch = mockFetchQueue([
        {
          createDataSubCategory: {
            dataSubCategory: {
              id: 'cat-new',
              name: 'Email',
              category: 'CONTACT',
              description: 'Email address',
              owners: [],
              teams: [],
            },
          },
        },
      ]);
      vi.stubGlobal('fetch', mockFetch);

      const client = new InventoryMixin(API_KEY_AUTH);
      const result = await client.writeDataCategory({
        name: 'Email',
        category: 'CONTACT',
        description: 'Email address',
      });

      expect(result).toEqual({
        created: true,
        category: {
          id: 'cat-new',
          name: 'Email',
          category: 'CONTACT',
          description: 'Email address',
          ownerEmails: [],
          teamNames: [],
        },
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(lastRequestBody(mockFetch).query).toContain('createDataSubCategory');
    });

    it('updates the existing row when create reports a duplicate subcategory', async () => {
      const mockFetch = mockFetchQueue([
        graphqlErrors('Cannot add duplicate subcategory'),
        {
          dataSubCategories: {
            nodes: [
              {
                id: 'cat-1',
                name: 'Email',
                category: 'CONTACT',
                description: 'Old',
                owners: [],
                teams: [],
              },
            ],
            totalCount: 1,
          },
        },
        {
          updateDataSubCategories: {
            dataSubCategories: [
              {
                id: 'cat-1',
                name: 'Email',
                category: 'CONTACT',
                description: 'Updated',
                owners: [],
                teams: [],
              },
            ],
          },
        },
      ]);
      vi.stubGlobal('fetch', mockFetch);

      const client = new InventoryMixin(API_KEY_AUTH);
      const result = await client.writeDataCategory({
        name: 'Email',
        category: 'CONTACT',
        description: 'Updated',
      });

      expect(result.created).toBe(false);
      expect(result.category).toMatchObject({
        id: 'cat-1',
        description: 'Updated',
      });
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(requestBodyAt(mockFetch, 0).query).toContain('createDataSubCategory');
      expect(requestBodyAt(mockFetch, 1).variables).toMatchObject({
        filterBy: { text: 'Email' },
      });
      expect(requestBodyAt(mockFetch, 2).query).toContain('updateDataSubCategories');
    });

    it('rethrows non-duplicate create errors without listing', async () => {
      const mockFetch = mockFetchQueue([graphqlErrors('Unauthorized')]);
      vi.stubGlobal('fetch', mockFetch);

      const client = new InventoryMixin(API_KEY_AUTH);
      await expect(
        client.writeDataCategory({
          name: 'Email',
          category: 'CONTACT',
        }),
      ).rejects.toThrow(/Unauthorized/);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('updates by id without listing', async () => {
      const mockFetch = mockFetchQueue([
        {
          updateDataSubCategories: {
            dataSubCategories: [
              {
                id: 'cat-1',
                name: 'Email',
                category: 'CONTACT',
                description: 'Updated',
                owners: [],
                teams: [],
              },
            ],
          },
        },
      ]);
      vi.stubGlobal('fetch', mockFetch);

      const client = new InventoryMixin(API_KEY_AUTH);
      const result = await client.writeDataCategory({
        id: 'cat-1',
        description: 'Updated',
      });

      expect(result.created).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(lastRequestBody(mockFetch).query).toContain('updateDataSubCategories');
    });
  });

  describe('writeVendor', () => {
    it('updates by id without listing vendors', async () => {
      const mockFetch = mockFetchQueue([
        {
          updateVendors: {
            vendors: [
              {
                id: 'v-1',
                title: 'Acme',
                description: 'Updated',
                dataProcessingAgreementLink: null,
                contactName: null,
                contactEmail: null,
                contactPhone: null,
                websiteUrl: null,
                address: null,
                headquarterCountry: null,
                headquarterSubDivision: null,
                createdAt: '2024-01-01T00:00:00.000Z',
              },
            ],
          },
        },
      ]);
      vi.stubGlobal('fetch', mockFetch);

      const client = new InventoryMixin(API_KEY_AUTH);
      const result = await client.writeVendor({ id: 'v-1', description: 'Updated' });

      expect(result.created).toBe(false);
      expect(result.vendor.description).toBe('Updated');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(lastRequestBody(mockFetch).query).toContain('updateVendors');
    });

    it('updates existing vendor matched by title', async () => {
      const mockFetch = mockFetchQueue([
        {
          vendors: {
            nodes: [
              {
                id: 'v-1',
                title: 'Acme',
                description: 'Old',
                dataProcessingAgreementLink: null,
                contactName: null,
                contactEmail: null,
                contactPhone: null,
                websiteUrl: null,
                address: null,
                headquarterCountry: null,
                headquarterSubDivision: null,
                createdAt: '2024-01-01T00:00:00.000Z',
              },
            ],
            totalCount: 1,
          },
        },
        {
          updateVendors: {
            vendors: [
              {
                id: 'v-1',
                title: 'Acme',
                description: 'New',
                dataProcessingAgreementLink: null,
                contactName: 'Pat',
                contactEmail: null,
                contactPhone: null,
                websiteUrl: null,
                address: null,
                headquarterCountry: null,
                headquarterSubDivision: null,
                createdAt: '2024-01-01T00:00:00.000Z',
              },
            ],
          },
        },
      ]);
      vi.stubGlobal('fetch', mockFetch);

      const client = new InventoryMixin(API_KEY_AUTH);
      const result = await client.writeVendor({
        title: 'Acme',
        description: 'New',
        contactName: 'Pat',
      });

      expect(result.created).toBe(false);
      expect(result.vendor).toMatchObject({ id: 'v-1', description: 'New', contactName: 'Pat' });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('creates when title is not found', async () => {
      const mockFetch = mockFetchQueue([
        {
          vendors: { nodes: [], totalCount: 0 },
        },
        {
          createVendor: {
            vendor: {
              id: 'v-new',
              title: 'NewCo',
              description: 'Brand new',
              dataProcessingAgreementLink: null,
              contactName: null,
              contactEmail: null,
              contactPhone: null,
              websiteUrl: null,
              address: null,
              headquarterCountry: null,
              headquarterSubDivision: null,
              createdAt: '2024-02-01T00:00:00.000Z',
            },
          },
        },
      ]);
      vi.stubGlobal('fetch', mockFetch);

      const client = new InventoryMixin(API_KEY_AUTH);
      const result = await client.writeVendor({ title: 'NewCo', description: 'Brand new' });

      expect(result.created).toBe(true);
      expect(result.vendor.id).toBe('v-new');
      expect(requestBodyAt(mockFetch, 1).query).toContain('createVendor');
    });
  });
});
