import { OpenAPIHono, type RouteConfig, type RouteHandler, z } from "@hono/zod-openapi"
import { errorResponse } from "./response"

export type AppEnv = {
  Variables: {
    requestId: string
  }
}

export type AppOpenAPI = OpenAPIHono<AppEnv>

export type AppRouteHandler<R extends RouteConfig> = RouteHandler<R, AppEnv>

export const createRouter = (): AppOpenAPI =>
  new OpenAPIHono<AppEnv>({
    defaultHook: (result, c) => {
      if (!result.success) {
        return c.json(
          errorResponse("Validation failed", z.flattenError(result.error).fieldErrors),
          422,
        )
      }
    },
  })

