import { afterAll, afterEach, beforeEach, describe, expect, it } from "bun:test"
import { eq } from "drizzle-orm"
import { accounts, users } from "@/db/schema"
import { STRONG_PASSWORD_MESSAGE } from "@/modules/auth/auth.config"
import { createTestApp, extractCookieHeader } from "../helper/create-test-app"
import { cleanupTestDb, createTestDb } from "../helper/db"

describe("Auth & Users E2E", () => {
  const db = createTestDb()
  const app = createTestApp({ db })

  beforeEach(async () => {
    await cleanupTestDb(db)
  })

  afterEach(async () => {
    await cleanupTestDb(db)
  })

  afterAll(async () => {
    await db.$client.end()
  })

  it("rejects weak passwords on POST /api/v1/auth/signup", async () => {
    const res = await app.request("/api/v1/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Weak User",
        email: "weak@example.com",
        password: "weakpassword",
      }),
    })

    expect(res.status).toBe(400)
    const body = (await res.json()) as {
      statusCode: number
      details?: Array<{ path: string; message: string }>
    }
    expect(body.statusCode).toBe(400)
    expect(body.details?.some((d) => d.message === STRONG_PASSWORD_MESSAGE)).toBe(true)
  })

  it("runs signup, users lookup, reset-password, signout, and signin lifecycle with cookie sessions", async () => {
    // 1. Sign up (delegates to UsersService.create and auto-issues cookie session)
    const signUpRes = await app.request("/api/v1/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Alice",
        email: "Alice@Example.com",
        password: "Str0ng!Password",
      }),
    })

    expect(signUpRes.status).toBe(201)
    const setCookies = signUpRes.headers.getSetCookie()
    const sessionCookieRaw = setCookies.find((c) => c.startsWith("better-auth.session_token="))
    expect(sessionCookieRaw).toBeDefined()
    expect(sessionCookieRaw?.toLowerCase()).toContain("httponly")

    const signUpBody = (await signUpRes.json()) as {
      user: { id: number; name: string; email: string }
    }
    const firstUserId = signUpBody.user.id
    expect(Number.isSafeInteger(firstUserId) && firstUserId > 0).toBe(true)
    expect(signUpBody.user.email).toBe("alice@example.com")

    // Credential account is stored with hashed password (never plaintext)
    const [credAccount] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, firstUserId))
      .limit(1)
    expect(credAccount?.providerId).toBe("credential")
    expect(credAccount?.password).toBeTruthy()
    expect(credAccount?.password).not.toBe("Str0ng!Password")

    const cookieHeader = extractCookieHeader(signUpRes)

    // 2. Duplicate email returns 409 Conflict
    const duplicateRes = await app.request("/api/v1/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Alice Clone",
        email: "alice@example.com",
        password: "Str0ng!Password",
      }),
    })
    expect(duplicateRes.status).toBe(409)

    // 3. GET /api/v1/auth/me requires cookie and returns active user + session
    const unauthMeRes = await app.request("/api/v1/auth/me")
    expect(unauthMeRes.status).toBe(401)

    const authMeRes = await app.request("/api/v1/auth/me", {
      headers: { Cookie: cookieHeader },
    })
    expect(authMeRes.status).toBe(200)
    const authMeBody = (await authMeRes.json()) as {
      user: { id: number; email: string }
      session: { id: string; expiresAt: string }
    }
    expect(authMeBody.user.id).toBe(firstUserId)
    expect(authMeBody.user.email).toBe("alice@example.com")
    expect(Date.parse(authMeBody.session.expiresAt)).not.toBeNaN()

    // 4. Users module endpoints: GET /api/v1/users/me and GET /api/v1/users/:id
    const unauthUsersMe = await app.request("/api/v1/users/me")
    expect(unauthUsersMe.status).toBe(401)

    const usersMeRes = await app.request("/api/v1/users/me", {
      headers: { Cookie: cookieHeader },
    })
    expect(usersMeRes.status).toBe(200)
    const usersMe = (await usersMeRes.json()) as { id: number; email: string }
    expect(usersMe.id).toBe(firstUserId)
    expect(usersMe.email).toBe("alice@example.com")

    const userByIdRes = await app.request(`/api/v1/users/${firstUserId}`, {
      headers: { Cookie: cookieHeader },
    })
    expect(userByIdRes.status).toBe(200)
    const userById = (await userByIdRes.json()) as { id: number; name: string }
    expect(userById.id).toBe(firstUserId)
    expect(userById.name).toBe("Alice")

    const badUserIdRes = await app.request("/api/v1/users/not-a-number", {
      headers: { Cookie: cookieHeader },
    })
    expect(badUserIdRes.status).toBe(400)

    const missingUserRes = await app.request("/api/v1/users/999999", {
      headers: { Cookie: cookieHeader },
    })
    expect(missingUserRes.status).toBe(404)

    // 5. POST /api/v1/auth/reset-password (authenticated change password)
    const unauthResetRes = await app.request("/api/v1/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: "Str0ng!Password",
        newPassword: "NewStr0ng!Pass1",
      }),
    })
    expect(unauthResetRes.status).toBe(401)

    const weakResetRes = await app.request("/api/v1/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader },
      body: JSON.stringify({
        currentPassword: "Str0ng!Password",
        newPassword: "weakpassword",
      }),
    })
    expect(weakResetRes.status).toBe(400)

    const wrongCurrentResetRes = await app.request("/api/v1/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader },
      body: JSON.stringify({
        currentPassword: "Wr0ng!Password",
        newPassword: "NewStr0ng!Pass1",
      }),
    })
    expect(wrongCurrentResetRes.status).toBe(400)

    const resetRes = await app.request("/api/v1/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader },
      body: JSON.stringify({
        currentPassword: "Str0ng!Password",
        newPassword: "NewStr0ng!Pass1",
        revokeOtherSessions: true,
      }),
    })
    expect(resetRes.status).toBe(200)
    const rotatedCookie = extractCookieHeader(resetRes) || cookieHeader

    // 6. Sign out revokes session cookie
    const unauthSignOutRes = await app.request("/api/v1/auth/signout", { method: "POST" })
    expect(unauthSignOutRes.status).toBe(401)

    const signOutRes = await app.request("/api/v1/auth/signout", {
      method: "POST",
      headers: { Cookie: rotatedCookie },
    })
    expect(signOutRes.status).toBe(200)

    const afterSignOutMe = await app.request("/api/v1/auth/me", {
      headers: { Cookie: rotatedCookie },
    })
    expect(afterSignOutMe.status).toBe(401)

    // 7. Sign in fails with old password and succeeds with new password
    const oldPasswordLoginRes = await app.request("/api/v1/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "alice@example.com",
        password: "Str0ng!Password",
      }),
    })
    expect(oldPasswordLoginRes.status).toBe(401)

    const newPasswordLoginRes = await app.request("/api/v1/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "alice@example.com",
        password: "NewStr0ng!Pass1",
      }),
    })
    expect(newPasswordLoginRes.status).toBe(200)
    const freshCookie = extractCookieHeader(newPasswordLoginRes)
    expect(freshCookie).toContain("better-auth.session_token=")

    const freshMeRes = await app.request("/api/v1/auth/me", {
      headers: { Cookie: freshCookie },
    })
    expect(freshMeRes.status).toBe(200)
    const freshMe = (await freshMeRes.json()) as { user: { email: string } }
    expect(freshMe.user.email).toBe("alice@example.com")

    // 8. Second user receives incremented auto-increment ID
    const secondSignUpRes = await app.request("/api/v1/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Bob",
        email: "bob@example.com",
        password: "Str0ng!Password",
      }),
    })
    expect(secondSignUpRes.status).toBe(201)
    const secondBody = (await secondSignUpRes.json()) as { user: { id: number } }
    expect(secondBody.user.id).toBeGreaterThan(firstUserId)

    const dbUsers = await db.select().from(users)
    expect(dbUsers).toHaveLength(2)
  })

  it("updates authenticated user name via PATCH /api/v1/users/me", async () => {
    const unauthRes = await app.request("/api/v1/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Unauthorized" }),
    })
    expect(unauthRes.status).toBe(401)

    const signUpRes = await app.request("/api/v1/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Alice",
        email: "alice@example.com",
        password: "Str0ng!Password",
      }),
    })
    expect(signUpRes.status).toBe(201)
    const cookie = extractCookieHeader(signUpRes)

    const blankNameRes = await app.request("/api/v1/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ name: "   " }),
    })
    expect(blankNameRes.status).toBe(400)

    const missingNameRes = await app.request("/api/v1/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({}),
    })
    expect(missingNameRes.status).toBe(400)

    const longNameRes = await app.request("/api/v1/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ name: "A".repeat(101) }),
    })
    expect(longNameRes.status).toBe(400)

    const updateRes = await app.request("/api/v1/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ name: "  Alice Wonderland  " }),
    })
    expect(updateRes.status).toBe(200)
    const updated = (await updateRes.json()) as { name: string; email: string }
    expect(updated.name).toBe("Alice Wonderland")
    expect(updated.email).toBe("alice@example.com")

    const meRes = await app.request("/api/v1/users/me", { headers: { Cookie: cookie } })
    expect(meRes.status).toBe(200)
    const me = (await meRes.json()) as { name: string }
    expect(me.name).toBe("Alice Wonderland")

    const authMeRes = await app.request("/api/v1/auth/me", { headers: { Cookie: cookie } })
    expect(authMeRes.status).toBe(200)
    const authMe = (await authMeRes.json()) as { user: { name: string } }
    expect(authMe.user.name).toBe("Alice Wonderland")
  })

  it("deletes authenticated user and all owned items via DELETE /api/v1/users/me", async () => {
    const unauthRes = await app.request("/api/v1/users/me", { method: "DELETE" })
    expect(unauthRes.status).toBe(401)

    const aliceSignUp = await app.request("/api/v1/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Alice",
        email: "alice@example.com",
        password: "Str0ng!Password",
      }),
    })
    expect(aliceSignUp.status).toBe(201)
    const aliceBody = (await aliceSignUp.json()) as { user: { id: number } }
    const aliceCookie = extractCookieHeader(aliceSignUp)

    const bobSignUp = await app.request("/api/v1/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Bob",
        email: "bob@example.com",
        password: "Str0ng!Password",
      }),
    })
    expect(bobSignUp.status).toBe(201)
    const bobBody = (await bobSignUp.json()) as { user: { id: number } }
    const bobCookie = extractCookieHeader(bobSignUp)

    const aliceItem1Res = await app.request("/api/v1/items", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: aliceCookie },
      body: JSON.stringify({ name: "Alice Keyboard" }),
    })
    expect(aliceItem1Res.status).toBe(201)
    const aliceItem1 = (await aliceItem1Res.json()) as { id: string }

    const aliceItem2Res = await app.request("/api/v1/items", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: aliceCookie },
      body: JSON.stringify({ name: "Alice Mouse" }),
    })
    expect(aliceItem2Res.status).toBe(201)

    const bobItemRes = await app.request("/api/v1/items", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: bobCookie },
      body: JSON.stringify({ name: "Bob Monitor" }),
    })
    expect(bobItemRes.status).toBe(201)
    const bobItem = (await bobItemRes.json()) as { id: string }

    const deleteRes = await app.request("/api/v1/users/me", {
      method: "DELETE",
      headers: { Cookie: aliceCookie },
    })
    expect(deleteRes.status).toBe(204)

    // Alice's items are deleted while Bob's item remains intact
    const listRes = await app.request("/api/v1/items")
    expect(listRes.status).toBe(200)
    const listBody = (await listRes.json()) as {
      data: Array<{ id: string; userId: number; name: string }>
    }
    expect(listBody.data).toHaveLength(1)
    expect(listBody.data[0]?.id).toBe(bobItem.id)
    expect(listBody.data[0]?.userId).toBe(bobBody.user.id)

    const deletedItemRes = await app.request(`/api/v1/items/${aliceItem1.id}`)
    expect(deletedItemRes.status).toBe(404)

    // Alice user record is removed and old session cookie is immediately invalidated
    const lookupAliceRes = await app.request(`/api/v1/users/${aliceBody.user.id}`, {
      headers: { Cookie: bobCookie },
    })
    expect(lookupAliceRes.status).toBe(404)

    const oldUsersMeRes = await app.request("/api/v1/users/me", {
      headers: { Cookie: aliceCookie },
    })
    expect(oldUsersMeRes.status).toBe(401)

    const oldAuthMeRes = await app.request("/api/v1/auth/me", {
      headers: { Cookie: aliceCookie },
    })
    expect(oldAuthMeRes.status).toBe(401)

    // Deleted user can no longer sign in
    const signInDeletedRes = await app.request("/api/v1/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "alice@example.com",
        password: "Str0ng!Password",
      }),
    })
    expect(signInDeletedRes.status).toBe(401)
  })
})
