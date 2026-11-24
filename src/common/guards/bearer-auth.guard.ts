import { createMiddleware } from "hono/factory"
import { UnauthorizedException } from "@/common/exceptions/http.exception"
import type { AppEnv } from "@/common/types"

export type TokenVerifier = (token: string) => boolean | Promise<boolean>

/**
 * Reusable Guard middleware modeled after NestJS AuthGuard.
 */
export function createBearerAuthGuard(verifyToken: TokenVerifier) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const header = c.req.header("authorization")
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing or invalid Authorization header")
    }

    const token = header.slice("Bearer ".length).trim()
    if (!token || !(await verifyToken(token))) {
      throw new UnauthorizedException("Invalid or expired token")
    }

    c.set("authToken", token)
    await next()
  })
}
