import fs from 'node:fs';
import { join } from 'node:path';

import * as t from 'io-ts';
import { expect, describe, it, vi } from 'vitest';

import { readCsv } from '../index.js';

describe('readCsv', () => {
  it('should successfully parse a csv', () => {
    expect(readCsv(join(__dirname, 'sample.csv'), t.record(t.string, t.string))).to.deep.equal([
      {
        CASL_STATUS: 'Undefined',
        CONTACT_ID: '949858',
        'Data Subject': 'Customer',
        FIRST_NAME: 'Mike',
        GDPR_STATUS: 'LBI Notice Not Sent',
        LAST_NAME: 'Farrell',
        LINKEDIN_HANDLE: 'michaelfarrell',
        MOBILE_PHONE: '(860) 906-6012',
        OTHER_URL: '',
        PERSONAL_EMAIL: 'mike@transcend.io',
        PHONE: '',
        PREFERRED_EMAIL: 'mike@transcend.io',
        'Primary Company': 'Transcend',
        'Request Type': 'Opt In',
        SEARCH_ID: '10749',
        SEARCH_NAME: 'Transcend - Chief Technology Officer',
        SKYPE_HANDLE: '',
        STAGE_START_DATE: '2022-11-22',
        TITLE: 'Chief Technology Officer',
        WORK_EMAIL: '',
        WORK_PHONE: '',
      },
    ]);
  });

  it('reads through injected filesystem dependencies', () => {
    const readFileSync = vi.fn(() => 'name\nvalue\n');

    expect(
      readCsv(join(__dirname, 'ignored.csv'), t.type({ name: t.string }), undefined, {
        fs: {
          readFileSync: readFileSync as unknown as typeof fs.readFileSync,
        },
      }),
    ).to.deep.equal([{ name: 'value' }]);
    expect(readFileSync).toHaveBeenCalledWith(join(__dirname, 'ignored.csv'), 'utf-8');
  });

  it('throw an error for invalid file', () => {
    expect(() => readCsv(join(__dirname, 'sample.csv'), t.type({ notValid: t.string }))).to.throw(
      'Failed to decode codec',
    );
  });

  it('throw an error for invalid codec', () => {
    expect(() => readCsv(join(__dirname, 'sample.csvs'), t.record(t.string, t.string))).to.throw(
      'ENOENT: no such file or directory, open',
    );
  });

  it('throw an error for invalid format', () => {
    expect(() =>
      readCsv(join(__dirname, 'readCsv.test.ts'), t.record(t.string, t.string)),
    ).to.throw();
  });
});
