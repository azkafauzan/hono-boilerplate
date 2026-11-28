import type { MiddlewareHandler } from "hono"
import type { AppEnv } from "@/common/types"
import type { UsersService } from "@/modules/users/users.service"
import type { AuthInstance } from "./auth.config"
import { createAuthController } from "./auth.controller"
import { AuthService } from "./auth.service"

export interface AuthModuleDeps {
  auth: AuthInstance
  usersService: UsersService
  requireAuth: MiddlewareHandler<AppEnv>
}

export function createAuthModule(deps: AuthModuleDeps) {
  const service = new AuthService(deps.auth, deps.usersService)
  return createAuthController(service, deps.requireAuth)
}
