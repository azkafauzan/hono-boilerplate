import { createApp } from "@/app"
import { env } from "@/config/env"
import { closeDb, verifyDbConnection } from "@/db"
import { logger } from "@/lib/logger"

const getErrorReason = (err: unknown): string => {
  if (!(err instanceof Error)) return String(err)

  // pg wraps connection failures as `cause`; for dual-stack hosts (::1 + 127.0.0.1)
  // it is an AggregateError with an empty message, so read its inner errors instead.
  const cause = err.cause
  if (cause instanceof AggregateError && cause.errors.length > 0) {
    return cause.errors.map((e) => (e instanceof Error ? e.message : String(e))).join("; ")
  }
  if (cause instanceof Error && cause.message) return cause.message
  return err.message
}

// Fail fast if the database is unreachable
try {
  await verifyDbConnection()
  logger.info("Database connection verified successfully")
} catch (err) {
  logger.fatal(
    { reason: getErrorReason(err) },
    "Failed to connect to database on startup. Exiting...",
  )
  process.exit(1)
}

const app = createApp()

const server = Bun.serve({
  port: env.PORT,
  fetch: app.fetch,
})

logger.info({ url: server.url.href, env: env.NODE_ENV }, "Server is running")

// Graceful Shutdown
const shutdown = async (signal: NodeJS.Signals) => {
  logger.info({ signal }, "Shutting down gracefully...")
  try {
    // Stop accepting new connections and wait for in-flight requests to finish
    await server.stop()
    await closeDb()
  } catch (err) {
    logger.error({ err }, "Error during shutdown")
  }
  process.exit(0)
}

process.once("SIGINT", () => void shutdown("SIGINT"))
process.once("SIGTERM", () => void shutdown("SIGTERM"))
