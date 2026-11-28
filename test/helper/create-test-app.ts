import { type AppModuleOptions, createApp } from "@/app.module"
import { parseEnv } from "@/config/env"
import { createTestDb } from "./db"

export function createTestApp(options: AppModuleOptions = {}) {
  return createApp({
    env:
      options.env ??
      parseEnv({
        ...process.env,
        NODE_ENV: "test",
        BETTER_AUTH_URL: "http://localhost",
      }),
    db: options.db ?? createTestDb(),
    ...options,
  })
}

export function extractCookieHeader(res: Response): string {
  return res.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0]?.trim())
    .filter(Boolean)
    .join("; ")
}
