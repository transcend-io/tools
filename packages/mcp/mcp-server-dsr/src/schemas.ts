import { z } from '@transcend-io/mcp-server-core';
import { RequestAction } from '@transcend-io/privacy-types';

/** Zod schema for RequestAction */
export const RequestTypeEnum = z.nativeEnum(RequestAction);

/** Inferred type for RequestAction values */
export type RequestTypeInput = z.infer<typeof RequestTypeEnum>;
