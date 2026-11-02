import { verifyDbConnection } from "@/db"
import type { AppRouteHandler } from "@/lib/create-router"
import { errorResponse, successResponse } from "@/lib/response"
import type { CheckRoute } from "./health.routes"

export const check: AppRouteHandler<CheckRoute> = async (c) => {
  const timestamp = new Date().toISOString()

  try {
    await verifyDbConnection()
    return c.json(
      successResponse(
        {
          status: "ok" as const,
          timestamp,
          database: "connected" as const,
        },
        "Service is healthy",
      ),
      200,
    )
  } catch (_err) {
    return c.json(
      errorResponse("Service is degraded: database unreachable", {
        status: "degraded",
        timestamp,
        database: "disconnected",
      }),
      503,
    )
  }
}

