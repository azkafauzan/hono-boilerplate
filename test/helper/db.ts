import { parseEnv } from "@/config/env"
import { createDb, type Database } from "@/db"
import { accounts, items, sessions, users, verifications } from "@/db/schema"

export function createTestDb(): Database {
  const env = parseEnv({ ...process.env, NODE_ENV: "test" })
  return createDb(env.DATABASE_URL)
}

export async function cleanupTestDb(db: Database): Promise<void> {
  await db.delete(items)
  await db.delete(sessions)
  await db.delete(accounts)
  await db.delete(verifications)
  await db.delete(users)
}
