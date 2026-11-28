import { createRoute } from "@hono/zod-openapi"
import type { MiddlewareHandler } from "hono"
import { ErrorResponseSchema } from "@/common/dto/error.dto"
import { UnauthorizedException } from "@/common/exceptions/http.exception"
import { createRouter } from "@/common/router"
import type { AppEnv } from "@/common/types"
import {
  toUserResponse,
  UpdateUserNameDtoSchema,
  UserIdParamSchema,
  UserResponseSchema,
} from "./users.dto"
import type { UsersService } from "./users.service"

const getMeRoute = createRoute({
  method: "get",
  path: "/me",
  tags: ["Users"],
  summary: "Get the currently authenticated user profile",
  security: [{ CookieAuth: [] }],
  responses: {
    200: {
      description: "Current user profile",
      content: { "application/json": { schema: UserResponseSchema } },
    },
    401: {
      description: "Authentication required",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
})

const updateMeRoute = createRoute({
  method: "patch",
  path: "/me",
  tags: ["Users"],
  summary: "Update the currently authenticated user's name",
  security: [{ CookieAuth: [] }],
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: UpdateUserNameDtoSchema } },
    },
  },
  responses: {
    200: {
      description: "User name updated",
      content: { "application/json": { schema: UserResponseSchema } },
    },
    400: {
      description: "Validation failed",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Authentication required",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    404: {
      description: "User not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
})

const deleteMeRoute = createRoute({
  method: "delete",
  path: "/me",
  tags: ["Users"],
  summary: "Delete the currently authenticated user and all owned items",
  security: [{ CookieAuth: [] }],
  responses: {
    204: {
      description: "User and owned items deleted",
    },
    401: {
      description: "Authentication required",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    404: {
      description: "User not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
})

const getUserByIdRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Users"],
  summary: "Get a user by ID",
  security: [{ CookieAuth: [] }],
  request: {
    params: UserIdParamSchema,
  },
  responses: {
    200: {
      description: "User found",
      content: { "application/json": { schema: UserResponseSchema } },
    },
    400: {
      description: "Invalid user ID",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Authentication required",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    404: {
      description: "User not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
})

export function createUsersController(
  usersService: UsersService,
  requireAuth: MiddlewareHandler<AppEnv>,
) {
  const router = createRouter()
  router.use("*", requireAuth)

  return router
    .openapi(getMeRoute, async (c) => {
      const authUser = c.get("authUser")
      if (!authUser) throw new UnauthorizedException("Authentication required")
      const user = await usersService.findById(authUser.id)
      return c.json(toUserResponse(user), 200)
    })
    .openapi(updateMeRoute, async (c) => {
      const authUser = c.get("authUser")
      if (!authUser) throw new UnauthorizedException("Authentication required")
      const dto = c.req.valid("json")
      const updated = await usersService.updateName(authUser.id, dto)
      return c.json(toUserResponse(updated), 200)
    })
    .openapi(deleteMeRoute, async (c) => {
      const authUser = c.get("authUser")
      if (!authUser) throw new UnauthorizedException("Authentication required")
      await usersService.remove(authUser.id)
      return c.body(null, 204)
    })
    .openapi(getUserByIdRoute, async (c) => {
      const { id } = c.req.valid("param")
      const user = await usersService.findById(id)
      return c.json(toUserResponse(user), 200)
    })
}
