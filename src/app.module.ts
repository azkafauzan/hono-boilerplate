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
import { type AuthInstance, createAuth } from "@/modules/auth/auth.config"
import { createSessionAuthGuard } from "@/modules/auth/auth.guard"
import { createAuthModule } from "@/modules/auth/auth.module"
import { createHealthModule } from "@/modules/health/health.module"
import { createItemsModule } from "@/modules/items/items.module"
import type { ItemsRepository } from "@/modules/items/items.repository"
import { createUsersModule } from "@/modules/users/users.module"
import { DrizzleUsersRepository, type UsersRepository } from "@/modules/users/users.repository"
import { UsersService } from "@/modules/users/users.service"

export interface AppModuleOptions {
  env?: Env
  logger?: AppLogger
  db?: Database
  auth?: AuthInstance
  usersRepository?: UsersRepository
  itemsRepository?: ItemsRepository
}

export function createApp(options: AppModuleOptions = {}) {
  const env = options.env ?? parseEnv()
  const logger = options.logger ?? createLogger({ level: env.LOG_LEVEL, nodeEnv: env.NODE_ENV })

  const app = createRouter()

  app.use("*", secureHeaders())
  app.use(
    "*",
    cors({
      origin: env.CORS_ORIGIN,
      ...(env.CORS_ORIGIN !== "*" ? { credentials: true } : {}),
    }),
  )
  app.use("*", requestId())
  app.use("*", createLoggingInterceptor(logger))

  app.onError(createHttpExceptionFilter(env.NODE_ENV))
  app.notFound(notFoundFilter)

  app.openAPIRegistry.registerComponent("securitySchemes", "BearerAuth", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
  })
  app.openAPIRegistry.registerComponent("securitySchemes", "CookieAuth", {
    type: "apiKey",
    in: "cookie",
    name: "better-auth.session_token",
  })

  const db = options.db ?? createDb(env.DATABASE_URL)
  const auth = options.auth ?? createAuth({ db, env })
  const requireAuth = createSessionAuthGuard(auth)

  const usersRepository = options.usersRepository ?? new DrizzleUsersRepository(db)
  const usersService = new UsersService(usersRepository)
  const usersModule = createUsersModule({ service: usersService, requireAuth })
  const authModule = createAuthModule({ auth, usersService, requireAuth })

  const itemsModule = options.itemsRepository
    ? createItemsModule({ repository: options.itemsRepository, requireAuth })
    : createItemsModule({ db, requireAuth })

  const routes = app
    .route("/health", createHealthModule())
    .route("/api/v1/auth", authModule)
    .route("/api/v1/users", usersModule)
    .route("/api/v1/items", itemsModule)

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
