import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { APIError, createAuthMiddleware } from "better-auth/api"
import type { Env } from "@/config/env"
import type { Database } from "@/db"
import { users } from "@/modules/users/users.entity"
import { accounts, sessions, verifications } from "./auth.entity"

const PASSWORD_ENDPOINTS = new Map<string, "password" | "newPassword">([
  ["/sign-up/email", "password"],
  ["/change-password", "newPassword"],
  ["/reset-password", "newPassword"],
  ["/set-password", "newPassword"],
])

export const STRONG_PASSWORD_MESSAGE =
  "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character"

export function isStrongPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    password.length <= 128 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  )
}

export function createAuth(options: { db: Database; env: Env }) {
  const { db, env } = options
  const corsOrigins =
    env.CORS_ORIGIN === "*"
      ? []
      : Array.isArray(env.CORS_ORIGIN)
        ? env.CORS_ORIGIN
        : [env.CORS_ORIGIN]
  const trustedOrigins = Array.from(new Set([env.BETTER_AUTH_URL, ...corsOrigins]))

  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { users, sessions, accounts, verifications },
      usePlural: true,
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
    },
    advanced: {
      database: {
        generateId: "serial",
      },
      useSecureCookies: env.NODE_ENV === "production",
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        const field = PASSWORD_ENDPOINTS.get(ctx.path)
        if (!field) return
        const body = ctx.body as Record<string, unknown> | undefined
        const value = body?.[field]
        if (typeof value === "string" && !isStrongPassword(value)) {
          throw new APIError("BAD_REQUEST", {
            message: STRONG_PASSWORD_MESSAGE,
          })
        }
      }),
    },
  })
}

export type AuthInstance = ReturnType<typeof createAuth>
export type AuthSession = AuthInstance["$Infer"]["Session"]["session"]
export type AuthUser = Omit<AuthInstance["$Infer"]["Session"]["user"], "id"> & { id: number }
