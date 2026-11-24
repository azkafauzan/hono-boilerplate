import { OpenAPIHono } from "@hono/zod-openapi"
import type { AppEnv } from "./types"

/**
 * Creates a typed OpenAPIHono router with a global ValidationPipe-style hook.
 */
export function createRouter() {
  return new OpenAPIHono<AppEnv>({
    defaultHook: (result, c) => {
      if (!result.success) {
        return c.json(
          {
            statusCode: 400,
            error: "Bad Request",
            message: "Validation failed",
            requestId: c.get("requestId"),
            details: result.error.issues.map((issue) => ({
              path: issue.path.map(String).join("."),
              message: issue.message,
            })),
          },
          400,
        )
      }
    },
  })
}
