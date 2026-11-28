import type { MiddlewareHandler } from "hono"
import type { AppEnv } from "@/common/types"
import type { Database } from "@/db"
import { createUsersController } from "./users.controller"
import { DrizzleUsersRepository, type UsersRepository } from "./users.repository"
import { UsersService } from "./users.service"

export type UsersModuleDeps = (
  | { db: Database }
  | { repository: UsersRepository }
  | { service: UsersService }
) & {
  requireAuth: MiddlewareHandler<AppEnv>
}

export function createUsersModule(deps: UsersModuleDeps) {
  const service =
    "service" in deps
      ? deps.service
      : new UsersService(
          "repository" in deps ? deps.repository : new DrizzleUsersRepository(deps.db),
        )
  return createUsersController(service, deps.requireAuth)
}
