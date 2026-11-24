import { createRoute } from "@hono/zod-openapi"
import { createRouter } from "@/common/router"
import { HealthResponseSchema } from "./health.dto"
import type { HealthService } from "./health.service"

const checkHealthRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Health"],
  summary: "Service liveness check",
  responses: {
    200: {
      description: "Service is healthy",
      content: {
        "application/json": {
          schema: HealthResponseSchema,
        },
      },
    },
  },
})

export function createHealthController(healthService: HealthService) {
  return createRouter().openapi(checkHealthRoute, (c) => {
    return c.json(healthService.check(), 200)
  })
}
