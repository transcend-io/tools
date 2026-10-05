import { makeEnum } from './enum.js';

/**
 * The HTTP method types.
 */
export const HttpMethod = {
  /** A GET request. */
  Get: 'GET',
  /** A POST request. */
  Post: 'POST',
  /** A DELETE request. */
  Delete: 'DELETE',
  /** A PUT request. */
  Put: 'PUT',
  /** A PATCH request. */
  Patch: 'PATCH',
} as const;

/**
 * The HTTP method string union.
 */
export type HttpMethod = (typeof HttpMethod)[keyof typeof HttpMethod];
