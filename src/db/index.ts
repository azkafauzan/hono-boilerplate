import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import { env } from "@/config/env"
import { logger } from "@/lib/logger"
import * as schema from "./schema"

export const db = drizzle(env.DATABASE_URL, { schema })

db.$client.on("error", (err) => {
  logger.error({ err }, "Unexpected error on idle database client")
})

export const verifyDbConnection = async () => {
  await db.execute(sql`SELECT 1`)
}

export const closeDb = async () => {
  await db.$client.end()
}
