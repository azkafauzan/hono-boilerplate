import { type AppModuleOptions, createApp } from "@/app.module"
import { parseEnv } from "@/config/env"
import { createTestDb } from "./db"

export function createTestApp(options: AppModuleOptions = {}) {
  return createApp({
    env: options.env ?? parseEnv({ ...process.env, NODE_ENV: "test" }),
    db: options.db ?? createTestDb(),
    ...options,
  })
}
