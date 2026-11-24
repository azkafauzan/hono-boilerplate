import { structuredLogger } from "@hono/structured-logger"
import type { AppEnv } from "@/common/types"
import type { AppLogger } from "@/config/logger"

export function createLoggingInterceptor(rootLogger: AppLogger) {
  return structuredLogger<AppEnv, AppLogger>({
    createLogger: (c) => rootLogger.child({ requestId: c.get("requestId") }),
    skip: (c) => c.req.path === "/health",
    onResponse: (logger, c, elapsedMs) => {
      logger.info(
        {
          method: c.req.method,
          path: c.req.path,
          status: c.res.status,
          elapsedMs: Math.round(elapsedMs * 100) / 100,
        },
        "request completed",
      )
    },
    onError: (logger, err, c, elapsedMs) => {
      logger.error(
        {
          err,
          method: c.req.method,
          path: c.req.path,
          status: c.res.status,
          elapsedMs: Math.round(elapsedMs * 100) / 100,
        },
        "request failed",
      )
    },
  })
}
