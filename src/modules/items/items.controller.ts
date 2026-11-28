import { createRoute } from "@hono/zod-openapi"
import type { MiddlewareHandler } from "hono"
import { ErrorResponseSchema } from "@/common/dto/error.dto"
import { UnauthorizedException } from "@/common/exceptions/http.exception"
import { createRouter } from "@/common/router"
import type { AppEnv } from "@/common/types"
import {
  CreateItemDtoSchema,
  ItemIdParamSchema,
  ItemListResponseSchema,
  ItemResponseSchema,
  toItemResponse,
  UpdateItemDtoSchema,
} from "./items.dto"
import type { ItemsService } from "./items.service"

const listItemsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Items"],
  summary: "List all items",
  responses: {
    200: {
      description: "List of items",
      content: { "application/json": { schema: ItemListResponseSchema } },
    },
  },
})

const getItemRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Items"],
  summary: "Get an item by ID",
  request: {
    params: ItemIdParamSchema,
  },
  responses: {
    200: {
      description: "Item found",
      content: { "application/json": { schema: ItemResponseSchema } },
    },
    400: {
      description: "Invalid item ID",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    404: {
      description: "Item not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
})

const createItemRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Items"],
  summary: "Create a new item",
  security: [{ CookieAuth: [] }],
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: CreateItemDtoSchema } },
    },
  },
  responses: {
    201: {
      description: "Item created",
      content: { "application/json": { schema: ItemResponseSchema } },
    },
    400: {
      description: "Validation failed",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Authentication required",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
})

const updateItemRoute = createRoute({
  method: "patch",
  path: "/{id}",
  tags: ["Items"],
  summary: "Update an existing item",
  security: [{ CookieAuth: [] }],
  request: {
    params: ItemIdParamSchema,
    body: {
      required: true,
      content: { "application/json": { schema: UpdateItemDtoSchema } },
    },
  },
  responses: {
    200: {
      description: "Item updated",
      content: { "application/json": { schema: ItemResponseSchema } },
    },
    400: {
      description: "Validation failed",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Authentication required",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    403: {
      description: "Forbidden",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    404: {
      description: "Item not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
})

const deleteItemRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Items"],
  summary: "Delete an item",
  security: [{ CookieAuth: [] }],
  request: {
    params: ItemIdParamSchema,
  },
  responses: {
    204: {
      description: "Item deleted",
    },
    400: {
      description: "Invalid item ID",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Authentication required",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    403: {
      description: "Forbidden",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    404: {
      description: "Item not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
})

export function createItemsController(
  itemsService: ItemsService,
  requireAuth: MiddlewareHandler<AppEnv>,
) {
  const router = createRouter()
  router.post("/", requireAuth)
  router.patch("/:id", requireAuth)
  router.delete("/:id", requireAuth)

  return router
    .openapi(listItemsRoute, async (c) => {
      const items = await itemsService.findAll()
      return c.json({ data: items.map(toItemResponse) }, 200)
    })
    .openapi(getItemRoute, async (c) => {
      const { id } = c.req.valid("param")
      const item = await itemsService.findById(id)
      return c.json(toItemResponse(item), 200)
    })
    .openapi(createItemRoute, async (c) => {
      const authUser = c.get("authUser")
      if (!authUser) throw new UnauthorizedException("Authentication required")
      const dto = c.req.valid("json")
      const created = await itemsService.create(authUser.id, dto)
      return c.json(toItemResponse(created), 201)
    })
    .openapi(updateItemRoute, async (c) => {
      const authUser = c.get("authUser")
      if (!authUser) throw new UnauthorizedException("Authentication required")
      const { id } = c.req.valid("param")
      const dto = c.req.valid("json")
      const updated = await itemsService.update(id, authUser.id, dto)
      return c.json(toItemResponse(updated), 200)
    })
    .openapi(deleteItemRoute, async (c) => {
      const authUser = c.get("authUser")
      if (!authUser) throw new UnauthorizedException("Authentication required")
      const { id } = c.req.valid("param")
      await itemsService.remove(id, authUser.id)
      return c.body(null, 204)
    })
}
