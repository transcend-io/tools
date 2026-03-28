import { makeEnum } from '@transcend-io/type-utils';

/**
 * Permanent (e.g., device IDs, MAC address) or temporary (e.g., IP address)
 * identifiers needed to establish a connection for the current browsing session.
 */
export const ConnectionSubCategory = makeEnum({
  /** A Media Access Control address */
  MACAddress: 'MAC_ADDRESS',
  /** An internet protocol address */
  IPAddress: 'IP_ADDRESS',
  /** The User-Agent request header */
  UserAgent: 'USER_AGENT',
  /** Fallback subcategory */
  Connection: 'CONNECTION',
});

/**
 * Overload with type of integration
 */
export type ConnectionSubCategory =
  (typeof ConnectionSubCategory)[keyof typeof ConnectionSubCategory];
