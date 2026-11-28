import { describe, expect, it } from "bun:test"
import { createHttpExceptionFilter } from "@/common/filters/http-exception.filter"
import { createRouter } from "@/common/router"
import { type AuthInstance, isStrongPassword } from "@/modules/auth/auth.config"
import { createSessionAuthGuard } from "@/modules/auth/auth.guard"
import { AuthService } from "@/modules/auth/auth.service"
import type { UserEntity } from "@/modules/users/users.entity"
import type { UsersRepository } from "@/modules/users/users.repository"
import { UsersService } from "@/modules/users/users.service"

describe("Auth helpers, service, and session guard", () => {
  it("enforces strong password rules", () => {
    for (const weak of [
      "",
      "Ab1!xyz", // too short (7)
      "lowercase1!", // missing uppercase
      "UPPERCASE1!", // missing lowercase
      "NoDigitsHere!", // missing digit
      "NoSymbol1234", // missing special character
      `${"A".repeat(126)}a1!`, // too long (129)
    ]) {
      expect(isStrongPassword(weak)).toBe(false)
    }

    for (const strong of ["Str0ng!Pass", "MyP@ssw0rd2026", "aB3#defgh"]) {
      expect(isStrongPassword(strong)).toBe(true)
    }
  })

  it("delegates user creation during AuthService.signup to UsersService and returns session cookies", async () => {
    const now = new Date()
    let createdCount = 0
    const createdUser: UserEntity = {
      id: 10,
      name: "Alice",
      email: "alice@example.com",
      emailVerified: false,
      image: null,
      createdAt: now,
      updatedAt: now,
    }

    const fakeRepo: UsersRepository = {
      findById: async (id) => (id === createdUser.id ? createdUser : undefined),
      findByEmail: async () => undefined,
      createWithCredential: async (data) => {
        createdCount += 1
        expect(data.email).toBe("alice@example.com")
        expect(data.passwordHash).not.toBe("Str0ng!Password")
        return createdUser
      },
      updateName: async (id, name) =>
        id === createdUser.id ? { ...createdUser, name } : undefined,
      delete: async (id) => id === createdUser.id,
    }

    const fakeHeaders = new Headers()
    fakeHeaders.append("set-cookie", "better-auth.session_token=tok123; Path=/; HttpOnly")

    const fakeAuth: Pick<AuthInstance, "api"> = {
      api: {
        signInEmail: async () => ({
          headers: fakeHeaders,
          response: { user: { ...createdUser, id: String(createdUser.id) } },
        }),
      } as unknown as AuthInstance["api"],
    }

    const authService = new AuthService(fakeAuth, new UsersService(fakeRepo))
    const result = await authService.signup(
      { name: "Alice", email: "alice@example.com", password: "Str0ng!Password" },
      new Headers(),
    )

    expect(createdCount).toBe(1)
    expect(result.user.id).toBe(10)
    expect(result.setCookies).toEqual(["better-auth.session_token=tok123; Path=/; HttpOnly"])
  })

  it("protects routes via createSessionAuthGuard and converts serial user ID to number", async () => {
    const now = new Date()
    const fakeAuth: Pick<AuthInstance, "api"> = {
      api: {
        getSession: async ({ headers }: { headers: Headers }) => {
          const cookie = headers.get("cookie")
          if (cookie === "better-auth.session_token=valid") {
            return {
              user: {
                id: "42",
                name: "Alice",
                email: "alice@example.com",
                emailVerified: false,
                image: null,
                createdAt: now,
                updatedAt: now,
              },
              session: {
                id: "7",
                token: "valid",
                userId: "42",
                expiresAt: new Date(now.getTime() + 60_000),
                createdAt: now,
                updatedAt: now,
                ipAddress: null,
                userAgent: null,
              },
            }
          }
          if (cookie === "better-auth.session_token=bad-id") {
            return {
              user: {
                id: "not-a-number",
                name: "Bad",
                email: "bad@example.com",
                emailVerified: false,
                image: null,
                createdAt: now,
                updatedAt: now,
              },
              session: {
                id: "8",
                token: "bad-id",
                userId: "not-a-number",
                expiresAt: new Date(now.getTime() + 60_000),
                createdAt: now,
                updatedAt: now,
                ipAddress: null,
                userAgent: null,
              },
            }
          }
          return null
        },
      } as AuthInstance["api"],
    }

    const router = createRouter()
    router.onError(createHttpExceptionFilter("test"))
    router.use("/protected/*", createSessionAuthGuard(fakeAuth))
    router.get("/protected/me", (c) => {
      const user = c.get("authUser")
      return c.json({ id: user?.id, email: user?.email })
    })

    const unauthRes = await router.request("/protected/me")
    expect(unauthRes.status).toBe(401)

    const badIdRes = await router.request("/protected/me", {
      headers: { Cookie: "better-auth.session_token=bad-id" },
    })
    expect(badIdRes.status).toBe(401)

    const okRes = await router.request("/protected/me", {
      headers: { Cookie: "better-auth.session_token=valid" },
    })
    expect(okRes.status).toBe(200)
    expect(await okRes.json()).toEqual({ id: 42, email: "alice@example.com" })
  })
})
