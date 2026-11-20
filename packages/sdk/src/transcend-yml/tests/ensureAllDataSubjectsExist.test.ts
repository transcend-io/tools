import type { GraphQLClient } from 'graphql-request';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchAllDataSubjects = vi.fn();
const createDataSubject = vi.fn();

vi.mock('../../index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../index.js')>();
  return {
    ...actual,
    fetchAllDataSubjects: (...args: unknown[]) => fetchAllDataSubjects(...args),
    createDataSubject: (...args: unknown[]) => createDataSubject(...args),
  };
});

const { ensureAllDataSubjectsExist } = await import('../ensureAllDataSubjectsExist.js');

const client = {} as GraphQLClient;

beforeEach(() => {
  fetchAllDataSubjects.mockReset();
  createDataSubject.mockReset();
  fetchAllDataSubjects.mockResolvedValue([{ type: 'customer', id: 'ds-1' }]);
});

describe('ensureAllDataSubjectsExist', () => {
  it('throws when subjects are missing and data-subjects section is omitted', async () => {
    await expect(
      ensureAllDataSubjectsExist(
        {
          'data-silos': [
            { title: 'CRM', integrationName: 'salesforce', 'data-subjects': ['employee'] },
          ],
        },
        client,
      ),
    ).rejects.toThrow(/Missing data subject types.*employee/);
    expect(createDataSubject).not.toHaveBeenCalled();
  });

  it('creates missing subjects when data-subjects section is present', async () => {
    createDataSubject.mockResolvedValue({ type: 'employee', id: 'ds-2' });
    await ensureAllDataSubjectsExist(
      {
        'data-subjects': [{ type: 'employee', title: 'Employee' }],
        'data-silos': [
          { title: 'CRM', integrationName: 'salesforce', 'data-subjects': ['employee'] },
        ],
      },
      client,
    );
    expect(createDataSubject).toHaveBeenCalledWith(client, {
      input: 'employee',
      logger: expect.anything(),
    });
  });
});
