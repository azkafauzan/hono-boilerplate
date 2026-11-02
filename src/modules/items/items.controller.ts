import type { AppRouteHandler } from "@/lib/create-router"
import { errorResponse, paginatedResponse, successResponse } from "@/lib/response"
import type { CreateRoute, GetOneRoute, ListRoute, RemoveRoute, UpdateRoute } from "./items.routes"
import { itemsService } from "./items.service"

const ITEM_NOT_FOUND = "Item not found"

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const { page, limit } = c.req.valid("query")
  const { data, total } = await itemsService.findAll({ page, limit })
  return c.json(paginatedResponse(data, total, page, limit, "Items retrieved successfully"), 200)
}

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param")
  const item = await itemsService.findById(id)
  if (!item) {
    return c.json(errorResponse(ITEM_NOT_FOUND), 404)
  }
  return c.json(successResponse(item, "Item retrieved successfully"), 200)
}

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const body = c.req.valid("json")
  const item = await itemsService.create(body)
  return c.json(successResponse(item, "Item created successfully"), 201)
}

export const update: AppRouteHandler<UpdateRoute> = async (c) => {
  const { id } = c.req.valid("param")
  const body = c.req.valid("json")
  const item = await itemsService.update(id, body)
  if (!item) {
    return c.json(errorResponse(ITEM_NOT_FOUND), 404)
  }
  return c.json(successResponse(item, "Item updated successfully"), 200)
}

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const { id } = c.req.valid("param")
  const item = await itemsService.remove(id)
  if (!item) {
    return c.json(errorResponse(ITEM_NOT_FOUND), 404)
  }
  return c.json(successResponse(item, "Item deleted successfully"), 200)
}

