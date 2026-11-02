import { cors } from "hono/cors"
import { requestId } from "hono/request-id"
import { secureHeaders } from "hono/secure-headers"
import { env } from "@/config/env"
import { createRouter } from "@/lib/create-router"
import { configureOpenAPI } from "@/lib/openapi"
import { errorHandler, notFoundHandler } from "@/middlewares/error.middleware"
import { requestLogger } from "@/middlewares/logger.middleware"
import { healthRouter } from "@/modules/health/health.routes"
import { itemsRouter } from "@/modules/items/items.routes"
import pkg from "../package.json"

/**
 * Composes the Hono application: global middlewares, feature modules,
 * OpenAPI docs and error handlers. Free of side effects so it can be
 * imported safely from tests.
 */
export const createApp = () => {
  const app = createRouter()

  // Middlewares
  app.use(requestId())
  app.use(secureHeaders())
  app.use(requestLogger())
  app.use(cors({ origin: env.CORS_ORIGIN }))

  // Root
  app.get("/", (c) => {
    return c.json({
      name: pkg.name,
      version: pkg.version,
      docs: "/swagger",
    })
  })

  // Feature modules
  app.route("/health", healthRouter)
  app.route("/items", itemsRouter)

  // Swagger / OpenAPI documentation
  configureOpenAPI(app)

  // Global Error Handling
  app.onError(errorHandler)
  app.notFound(notFoundHandler)

  return app
}
