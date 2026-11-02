import { z } from "zod"

const DEFAULT_DATABASE_URL = "postgres://postgres:postgres@localhost:5432/hono_db"

const DEFAULT_LOG_LEVEL = {
  production: "info",
  development: "debug",
  test: "silent",
} as const

const envSchema = z
  .object({
    PORT: z.coerce.number().int().positive().default(3000),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    DATABASE_URL: z.string().min(1).optional(),
    CORS_ORIGIN: z
      .string()
      .default("*")
      .transform((value) =>
        value === "*"
          ? "*"
          : value
              .split(",")
              .map((origin) => origin.trim())
              .filter(Boolean),
      ),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).optional(),
  })
  .transform((data, ctx) => {
    if (!data.DATABASE_URL && data.NODE_ENV === "production") {
      ctx.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message: "DATABASE_URL must be explicitly set in production environment",
      })
      return z.NEVER
    }

    return {
      ...data,
      DATABASE_URL: data.DATABASE_URL ?? DEFAULT_DATABASE_URL,
      // Tests are always silent so a LOG_LEVEL from .env doesn't flood the test output
      LOG_LEVEL:
        data.NODE_ENV === "test" ? "silent" : (data.LOG_LEVEL ?? DEFAULT_LOG_LEVEL[data.NODE_ENV]),
    }
  })

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error("Invalid environment variables:", z.treeifyError(parsed.error))
  process.exit(1)
}

export const env = parsed.data
