import { describe, expect, it } from 'vitest';

import { gql, type Gql } from '../gql.js';

describe('gql', () => {
  it('compiles a template with no expressions', () => {
    expect(gql`This is a test`).toBe('This is a test');
  });

  it('compiles a template with expressions', () => {
    type DataSubjectInterface = {
      /** ID */
      id: string;
    };

    const interfaceType = gql`
      """
      A classification of data subjects that the organization may have
      """
      interface DataSubjectInterface {
        """
        This is an id
        """
        id: ID
      }
    ` as Gql<DataSubjectInterface>;

    const typeType = gql`
      """ The internal configuration for a data subject """
      type DataSubjectInternal implements DataSubjectInterface {
        ${interfaceType}
        """ Whether the data subject is currently turned on """
        active: Boolean!,
      }
    `;

    expect(typeType).toBe(
      `
      """ The internal configuration for a data subject """
      type DataSubjectInternal implements DataSubjectInterface {
        
        """
        This is an id
        """
        id: ID
      
        """ Whether the data subject is currently turned on """
        active: Boolean!,
      }
    `,
    );
  });
});
