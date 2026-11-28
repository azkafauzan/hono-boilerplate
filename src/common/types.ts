import type { AppLogger } from "@/config/logger"
import type { AuthSession, AuthUser } from "@/modules/auth/auth.config"

export type AppEnv = {
  Variables: {
    requestId: string
    logger: AppLogger
    authToken?: string
    authUser?: AuthUser
    authSession?: AuthSession
  }
}
