import { makeEnum } from '@transcend-io/type-utils';

/**
 * The type of operating system (OS) or web browser that the user uses, or similar computer or device information.
 */
export const DeviceSubCategory = {
  /** A unique device identifier */
  SerialNumber: 'SERIAL_NUMBER',
  /** Fallback subcategory */
  Device: 'DEVICE',
} as const;

/**
 * Overload with type of integration
 */
export type DeviceSubCategory = (typeof DeviceSubCategory)[keyof typeof DeviceSubCategory];
