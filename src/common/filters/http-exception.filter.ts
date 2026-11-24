import type { ErrorHandler, NotFoundHandler } from "hono"
import { HTTPException } from "hono/http-exception"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import { ZodError } from "zod"
import { AppHttpException } from "@/common/exceptions/http.exception"
import type { AppEnv } from "@/common/types"

const STATUS_LABELS: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  415: "Unsupported Media Type",
  422: "Unprocessable Entity",
  429: "Too Many Requests",
  500: "Internal Server Error",
}

function extractPgErrorCode(err: unknown): string | undefined {
  if (typeof err !== "object" || err === null) return undefined
  const direct = (err as { code?: unknown }).code
  if (typeof direct === "string") return direct
  const cause = (err as { cause?: unknown }).cause
  if (typeof cause === "object" && cause !== null) {
    const nested = (cause as { code?: unknown }).code
    if (typeof nested === "string") return nested
  }
  return undefined
}

/**
 * Global exception filter (modeled after NestJS ExceptionFilter).
 * Intentionally does not log errors because @hono/structured-logger's onError hook logs them once.
 */
export function createHttpExceptionFilter(nodeEnv: string): ErrorHandler<AppEnv> {
  return (err, c) => {
    const requestId = c.get("requestId")

    if (err instanceof AppHttpException) {
      return c.json(
        {
          statusCode: err.status,
          error: err.errorName,
          message: err.message,
          requestId,
          ...(err.details !== undefined ? { details: err.details } : {}),
        },
        err.status,
      )
    }

    if (err instanceof HTTPException) {
      const status = err.status as ContentfulStatusCode
      return c.json(
        {
          statusCode: status,
          error: STATUS_LABELS[status] ?? "HTTP Error",
          message: err.message || STATUS_LABELS[status] || "Request failed",
          requestId,
        },
        status,
      )
    }

    if (err instanceof ZodError) {
      return c.json(
        {
          statusCode: 400,
          error: "Bad Request",
          message: "Validation failed",
          requestId,
          details: err.issues.map((issue) => ({
            path: issue.path.map(String).join("."),
            message: issue.message,
          })),
        },
        400,
      )
    }

    const pgCode = extractPgErrorCode(err)
    if (pgCode === "23505") {
      return c.json(
        {
          statusCode: 409,
          error: "Conflict",
          message: "Resource already exists",
          requestId,
        },
        409,
      )
    }
    if (pgCode === "23503") {
      return c.json(
        {
          statusCode: 400,
          error: "Bad Request",
          message: "Referenced resource does not exist",
          requestId,
        },
        400,
      )
    }
    if (pgCode === "22P02") {
      return c.json(
        {
          statusCode: 400,
          error: "Bad Request",
          message: "Invalid input syntax",
          requestId,
        },
        400,
      )
    }

    const message =
      nodeEnv === "production" ? "Internal Server Error" : err.message || "Internal Server Error"

    return c.json(
      {
        statusCode: 500,
        error: "Internal Server Error",
        message,
        requestId,
      },
      500,
    )
  }
}

export const notFoundFilter: NotFoundHandler<AppEnv> = (c) => {
  return c.json(
    {
      statusCode: 404,
      error: "Not Found",
      message: `Route ${c.req.method} ${c.req.path} not found`,
      requestId: c.get("requestId"),
    },
    404,
  )
}
