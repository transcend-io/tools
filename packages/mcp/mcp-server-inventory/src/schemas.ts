import { z, PaginationSchema } from '@transcend-io/mcp-server-core';

export const ListDataSilosSchema = PaginationSchema;

export const GetDataSiloSchema = z.object({
  data_silo_id: z.string(),
});

export const CreateDataSiloSchema = z.object({
  title: z.string(),
});

export const UpdateDataSiloSchema = z.object({
  data_silo_id: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
});

export const ListVendorsSchema = PaginationSchema;
export const ListDataPointsSchema = PaginationSchema;

export const ListSubDataPointsSchema = z.object({
  data_point_id: z.string(),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
});

export const ListIdentifiersSchema = PaginationSchema;
export const ListCategoriesSchema = PaginationSchema;
export const InventoryAnalyzeSchema = z.object({});

export type ListDataSilosInput = z.infer<typeof ListDataSilosSchema>;
export type GetDataSiloInput = z.infer<typeof GetDataSiloSchema>;
export type CreateDataSiloInput = z.infer<typeof CreateDataSiloSchema>;
export type UpdateDataSiloInput = z.infer<typeof UpdateDataSiloSchema>;
export type ListVendorsInput = z.infer<typeof ListVendorsSchema>;
export type ListDataPointsInput = z.infer<typeof ListDataPointsSchema>;
export type ListSubDataPointsInput = z.infer<typeof ListSubDataPointsSchema>;
export type ListIdentifiersInput = z.infer<typeof ListIdentifiersSchema>;
export type ListCategoriesInput = z.infer<typeof ListCategoriesSchema>;
export type InventoryAnalyzeInput = z.infer<typeof InventoryAnalyzeSchema>;
