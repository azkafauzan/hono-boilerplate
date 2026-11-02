import { structuredLogger } from "@hono/structured-logger"
import { logger } from "@/lib/logger"

export const requestLogger = () =>
  structuredLogger({
    createLogger: (c) => logger.child({ requestId: c.var.requestId }),
    onRequest: (log, c) => {
      log.info(
        {
          method: c.req.method,
          path: c.req.path,
          userAgent: c.req.header("user-agent"),
        },
        "incoming request",
      )
    },
    onResponse: (log, c, elapsedMs) => {
      log.info(
        {
          status: c.res.status,
          elapsedMs,
          contentLength: c.res.headers.get("content-length"),
        },
        "request completed",
      )
    },
    onError: (log, err, c, elapsedMs) => {
      log.error(
        {
          err,
          method: c.req.method,
          path: c.req.path,
          elapsedMs,
        },
        "request failed",
      )
    },
  })
