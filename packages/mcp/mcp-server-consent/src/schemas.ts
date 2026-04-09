import { z } from '@transcend-io/mcp-server-core';
import {
  ConsentTrackerStatus,
  ConsentTrackerType,
  CookieOrderField,
  DataFlowOrderField,
  OrderDirection,
  TriageAction,
} from '@transcend-io/privacy-types';

/** Zod schema for ConsentTrackerStatus */
export const ConsentTrackerStatusEnum = z.nativeEnum(ConsentTrackerStatus);

/** Zod schema for OrderDirection */
export const OrderDirectionEnum = z.nativeEnum(OrderDirection);

/** Zod schema for CookieOrderField */
export const CookieOrderFieldEnum = z.nativeEnum(CookieOrderField);

/** Zod schema for DataFlowOrderField */
export const DataFlowOrderFieldEnum = z.nativeEnum(DataFlowOrderField);

/** Zod schema for TriageAction */
export const TriageActionEnum = z.nativeEnum(TriageAction);

/** Zod schema for ConsentTrackerType */
export const ConsentTrackerTypeEnum = z.nativeEnum(ConsentTrackerType);
