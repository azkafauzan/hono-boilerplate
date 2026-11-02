import { createRoute, z } from "@hono/zod-openapi"
import { createRouter } from "@/lib/create-router"
import { jsonContent } from "@/lib/openapi"
import { ApiErrorSchema, ApiResponseSchema } from "@/lib/schemas"
import * as controller from "./health.controller"

const HealthResponseSchema = z
  .object({
    status: z.enum(["ok", "degraded"]).openapi({ example: "ok" }),
    timestamp: z.string().openapi({ example: "2026-10-28T14:00:00.000Z" }),
    database: z.enum(["connected", "disconnected"]).openapi({ example: "connected" }),
  })
  .openapi("HealthResponse")

export const check = createRoute({
  method: "get",
  path: "/",
  tags: ["Health"],
  summary: "Health check endpoint",
  responses: {
    200: jsonContent(ApiResponseSchema(HealthResponseSchema), "Service is healthy"),
    503: jsonContent(ApiErrorSchema, "Service is degraded or database is unreachable"),
  },
})

export type CheckRoute = typeof check

export const healthRouter = createRouter().openapi(check, controller.check)
