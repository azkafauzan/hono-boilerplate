import type { MiddlewareHandler } from "hono"
import type { AppEnv } from "@/common/types"
import type { Database } from "@/db"
import { createItemsController } from "./items.controller"
import { DrizzleItemsRepository, type ItemsRepository } from "./items.repository"
import { ItemsService } from "./items.service"

export type ItemsModuleDeps = ({ db: Database } | { repository: ItemsRepository }) & {
  requireAuth: MiddlewareHandler<AppEnv>
}

export function createItemsModule(deps: ItemsModuleDeps) {
  const repository = "repository" in deps ? deps.repository : new DrizzleItemsRepository(deps.db)
  const service = new ItemsService(repository)
  return createItemsController(service, deps.requireAuth)
}
