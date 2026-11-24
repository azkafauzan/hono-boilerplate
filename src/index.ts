import { createApp } from "@/app.module"
import { parseEnv } from "@/config/env"
import { createLogger } from "@/config/logger"
import { createDb } from "@/db"

const env = parseEnv()
const logger = createLogger({ level: env.LOG_LEVEL, nodeEnv: env.NODE_ENV })
const db = createDb(env.DATABASE_URL)

const app = createApp({ env, logger, db })

export type { AppType } from "@/app.module"
export default app
