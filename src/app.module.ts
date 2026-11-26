import { swaggerUI } from "@hono/swagger-ui"
import { cors } from "hono/cors"
import { requestId } from "hono/request-id"
import { secureHeaders } from "hono/secure-headers"
import { createHttpExceptionFilter, notFoundFilter } from "@/common/filters/http-exception.filter"
import { createLoggingInterceptor } from "@/common/interceptors/logging.interceptor"
import { createRouter } from "@/common/router"
import { type Env, parseEnv } from "@/config/env"
import { type AppLogger, createLogger } from "@/config/logger"
import { createDb, type Database } from "@/db"
import { createHealthModule } from "@/modules/health/health.module"
import { createItemsModule } from "@/modules/items/items.module"
import type { ItemsRepository } from "@/modules/items/items.repository"

export interface AppModuleOptions {
  env?: Env
  logger?: AppLogger
  db?: Database
  itemsRepository?: ItemsRepository
}

export function createApp(options: AppModuleOptions = {}) {
  const env = options.env ?? parseEnv()
  const logger = options.logger ?? createLogger({ level: env.LOG_LEVEL, nodeEnv: env.NODE_ENV })

  const app = createRouter()

  app.use("*", secureHeaders())
  app.use("*", cors({ origin: env.CORS_ORIGIN }))
  app.use("*", requestId())
  app.use("*", createLoggingInterceptor(logger))

  app.onError(createHttpExceptionFilter(env.NODE_ENV))
  app.notFound(notFoundFilter)

  app.openAPIRegistry.registerComponent("securitySchemes", "BearerAuth", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
  })

  const itemsModule = options.itemsRepository
    ? createItemsModule({ repository: options.itemsRepository })
    : createItemsModule({ db: options.db ?? createDb(env.DATABASE_URL) })

  const routes = app.route("/health", createHealthModule()).route("/api/v1/items", itemsModule)

  app.doc31("/doc", {
    openapi: "3.1.0",
    info: {
      title: "Hono Boilerplate API",
      version: "1.0.0",
    },
  })

  app.get("/docs", swaggerUI({ url: "/doc" }))

  return routes
}

export type AppType = ReturnType<typeof createApp>
