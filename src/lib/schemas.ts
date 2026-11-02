import { z } from "@hono/zod-openapi"

export const IdParamSchema = z.object({
  id: z.coerce
    .number()
    .int()
    .positive("ID must be a positive integer")
    .openapi({
      param: {
        name: "id",
        in: "path",
      },
      example: 1,
    }),
})

export const PaginationQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1, "Page must be at least 1")
    .default(1)
    .openapi({
      param: {
        name: "page",
        in: "query",
      },
      example: 1,
    }),
  limit: z.coerce
    .number()
    .int()
    .min(1, "Limit must be at least 1")
    .max(100, "Limit must not exceed 100")
    .default(10)
    .openapi({
      param: {
        name: "limit",
        in: "query",
      },
      example: 10,
    }),
})

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>

export const PaginationMetaSchema = z
  .object({
    page: z.number().int().openapi({ example: 1 }),
    limit: z.number().int().openapi({ example: 10 }),
    total: z.number().int().openapi({ example: 42 }),
    totalPages: z.number().int().openapi({ example: 5 }),
  })
  .openapi("PaginationMeta")

export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true).openapi({ example: true }),
    message: z.string().openapi({ example: "Operation successful" }),
    data: dataSchema,
  })

export const PaginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    success: z.literal(true).openapi({ example: true }),
    message: z.string().openapi({ example: "Operation successful" }),
    data: z.array(itemSchema),
    meta: PaginationMetaSchema,
  })

export const ApiErrorSchema = z
  .object({
    success: z.literal(false).openapi({ example: false }),
    message: z.string().openapi({ example: "Resource not found" }),
    error: z.unknown().optional(),
  })
  .openapi("ApiError")
