import type { AppLogger } from "@/config/logger"

export type AppEnv = {
  Variables: {
    requestId: string
    logger: AppLogger
    authToken?: string
  }
}
