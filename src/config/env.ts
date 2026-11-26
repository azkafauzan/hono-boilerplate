import { z } from "zod"

const DEFAULT_DEV_DATABASE_URL = "postgres://postgres:postgres@localhost:5432/app"
const DEFAULT_DEV_CORS_ORIGIN = "*"

function parseCorsOrigin(raw: string): string | string[] | null {
  const entries = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)

  if (entries.length === 0) return null
  if (entries.includes("*")) {
    return entries.length === 1 ? "*" : null
  }

  const normalized: string[] = []
  for (const entry of entries) {
    try {
      const url = new URL(entry)
      if (
        (url.protocol !== "http:" && url.protocol !== "https:") ||
        url.pathname !== "/" ||
        url.search !== "" ||
        url.hash !== "" ||
        url.username !== "" ||
        url.password !== ""
      ) {
        return null
      }
      normalized.push(url.origin)
    } catch {
      return null
    }
  }

  const unique = Array.from(new Set(normalized))
  const first = unique[0]
  if (unique.length === 1 && first !== undefined) return first
  return unique
}

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),
    DATABASE_URL: z.string().min(1).optional(),
    CORS_ORIGIN: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === "production" && !data.DATABASE_URL) {
      ctx.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message: "DATABASE_URL is required in production",
      })
    }
    if (data.NODE_ENV === "production" && data.CORS_ORIGIN === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["CORS_ORIGIN"],
        message: "CORS_ORIGIN is required in production",
      })
    } else if (data.CORS_ORIGIN !== undefined && parseCorsOrigin(data.CORS_ORIGIN) === null) {
      ctx.addIssue({
        code: "custom",
        path: ["CORS_ORIGIN"],
        message:
          'CORS_ORIGIN must be "*" or a comma-separated list of valid http(s) origins without paths',
      })
    }
  })
  .transform((data) => ({
    ...data,
    DATABASE_URL: data.DATABASE_URL ?? DEFAULT_DEV_DATABASE_URL,
    CORS_ORIGIN:
      data.CORS_ORIGIN !== undefined
        ? (parseCorsOrigin(data.CORS_ORIGIN) ?? DEFAULT_DEV_CORS_ORIGIN)
        : DEFAULT_DEV_CORS_ORIGIN,
  }))

export type Env = z.infer<typeof envSchema>

export function parseEnv(raw: Record<string, string | undefined> = process.env): Env {
  const parsed = envSchema.safeParse(raw)
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("; ")
    throw new Error(`Invalid environment configuration: ${details}`)
  }
  return parsed.data
}
