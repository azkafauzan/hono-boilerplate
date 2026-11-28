import { createMiddleware } from "hono/factory"
import { UnauthorizedException } from "@/common/exceptions/http.exception"
import type { AppEnv } from "@/common/types"
import type { AuthInstance } from "./auth.config"

/**
 * Verifies the Better Auth session cookie and populates authUser/authSession on context.
 */
export function createSessionAuthGuard(auth: Pick<AuthInstance, "api">) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const result = await auth.api.getSession({
      headers: c.req.raw.headers,
    })

    if (!result) {
      throw new UnauthorizedException("Authentication required")
    }

    const userId = Number(result.user.id)
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      throw new UnauthorizedException("Invalid session user")
    }

    c.set("authUser", { ...result.user, id: userId })
    c.set("authSession", result.session)
    await next()
  })
}
