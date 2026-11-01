import type { ErrorHandler, NotFoundHandler } from "hono"
import { HTTPException } from "hono/http-exception"
import { env } from "../config/env"
import { errorResponse } from "../lib/response"

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof HTTPException) {
    return c.json(errorResponse(err.message), err.status)
  }

  return c.json(
    errorResponse(
      env.NODE_ENV === "production" ? "Internal Server Error" : err.message,
      env.NODE_ENV === "production" ? null : err.stack,
    ),
    500,
  )
}

export const notFoundHandler: NotFoundHandler = (c) => {
  return c.json(errorResponse(`Route not found: ${c.req.method} ${c.req.path}`), 404)
}
