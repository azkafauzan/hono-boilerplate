import { createRoute } from "@hono/zod-openapi"
import { errorResponses, jsonContent, jsonContentRequired } from "@/lib/openapi"
import {
  ApiResponseSchema,
  IdParamSchema,
  PaginatedResponseSchema,
  PaginationQuerySchema,
} from "@/lib/schemas"
import { CreateItemSchema, ItemSchema, UpdateItemSchema } from "./items.schema"

const tags = ["Items"]

export const list = createRoute({
  method: "get",
  path: "/",
  tags,
  summary: "Get paginated items",
  request: {
    query: PaginationQuerySchema,
  },
  responses: {
    200: jsonContent(PaginatedResponseSchema(ItemSchema), "Paginated list of items"),
    422: errorResponses.validation,
  },
})

export const getOne = createRoute({
  method: "get",
  path: "/{id}",
  tags,
  summary: "Get item by ID",
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: jsonContent(ApiResponseSchema(ItemSchema), "Item details"),
    404: errorResponses.notFound,
    422: errorResponses.validation,
  },
})

export const create = createRoute({
  method: "post",
  path: "/",
  tags,
  summary: "Create a new item",
  request: {
    body: jsonContentRequired(CreateItemSchema, "Item to create"),
  },
  responses: {
    201: jsonContent(ApiResponseSchema(ItemSchema), "Created item"),
    422: errorResponses.validation,
  },
})

export const update = createRoute({
  method: "put",
  path: "/{id}",
  tags,
  summary: "Update item by ID",
  request: {
    params: IdParamSchema,
    body: jsonContentRequired(UpdateItemSchema, "Fields to update"),
  },
  responses: {
    200: jsonContent(ApiResponseSchema(ItemSchema), "Updated item"),
    404: errorResponses.notFound,
    422: errorResponses.validation,
  },
})

export const remove = createRoute({
  method: "delete",
  path: "/{id}",
  tags,
  summary: "Delete item by ID",
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: jsonContent(ApiResponseSchema(ItemSchema), "Deleted item"),
    404: errorResponses.notFound,
    422: errorResponses.validation,
  },
})

export type ListRoute = typeof list
export type GetOneRoute = typeof getOne
export type CreateRoute = typeof create
export type UpdateRoute = typeof update
export type RemoveRoute = typeof remove
