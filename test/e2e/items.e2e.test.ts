import { afterAll, afterEach, beforeEach, describe, expect, it } from "bun:test"
import { createTestApp, extractCookieHeader } from "../helper/create-test-app"
import { cleanupTestDb, createTestDb } from "../helper/db"

describe("ItemsModule E2E", () => {
  const db = createTestDb()
  const app = createTestApp({ db })

  async function signUpAndGetSession(name: string, email: string) {
    const res = await app.request("/api/v1/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password: "Str0ng!Password",
      }),
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as { user: { id: number } }
    return {
      userId: body.user.id,
      cookie: extractCookieHeader(res),
    }
  }

  beforeEach(async () => {
    await cleanupTestDb(db)
  })

  afterEach(async () => {
    await cleanupTestDb(db)
  })

  afterAll(async () => {
    await db.$client.end()
  })

  it("allows public GET and enforces cookie auth on POST/PATCH/DELETE", async () => {
    const publicListRes = await app.request("/api/v1/items")
    expect(publicListRes.status).toBe(200)
    expect(await publicListRes.json()).toEqual({ data: [] })

    const unauthCreate = await app.request("/api/v1/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Unauthorized Item" }),
    })
    expect(unauthCreate.status).toBe(401)

    const randomId = crypto.randomUUID()
    const unauthPatch = await app.request(`/api/v1/items/${randomId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Updated" }),
    })
    expect(unauthPatch.status).toBe(401)

    const unauthDelete = await app.request(`/api/v1/items/${randomId}`, {
      method: "DELETE",
    })
    expect(unauthDelete.status).toBe(401)
  })

  it("runs full CRUD lifecycle with cookie session and public reads", async () => {
    const alice = await signUpAndGetSession("Alice", "alice@example.com")

    const createRes = await app.request("/api/v1/items", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: alice.cookie,
      },
      body: JSON.stringify({
        name: "  Mechanical Keyboard  ",
      }),
    })
    expect(createRes.status).toBe(201)
    const created = (await createRes.json()) as {
      id: string
      name: string
      userId: number
      createdAt: string
      updatedAt: string
    }
    expect(created.name).toBe("Mechanical Keyboard")
    expect(created.userId).toBe(alice.userId)
    expect(Date.parse(created.createdAt)).not.toBeNaN()
    expect(Date.parse(created.updatedAt)).not.toBeNaN()

    // Public list & get work without cookie and include userId
    const listRes = await app.request("/api/v1/items")
    expect(listRes.status).toBe(200)
    const listBody = (await listRes.json()) as { data: Array<{ id: string; userId: number }> }
    expect(listBody.data).toHaveLength(1)
    expect(listBody.data[0]?.userId).toBe(alice.userId)

    const getRes = await app.request(`/api/v1/items/${created.id}`)
    expect(getRes.status).toBe(200)

    const patchRes = await app.request(`/api/v1/items/${created.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: alice.cookie,
      },
      body: JSON.stringify({ name: "Ergonomic Keyboard" }),
    })
    expect(patchRes.status).toBe(200)
    const updated = (await patchRes.json()) as { name: string; userId: number }
    expect(updated.name).toBe("Ergonomic Keyboard")
    expect(updated.userId).toBe(alice.userId)

    const deleteRes = await app.request(`/api/v1/items/${created.id}`, {
      method: "DELETE",
      headers: { Cookie: alice.cookie },
    })
    expect(deleteRes.status).toBe(204)

    const afterDeleteRes = await app.request(`/api/v1/items/${created.id}`)
    expect(afterDeleteRes.status).toBe(404)
  })

  it("enforces ownership across users while allowing 1:N items per user", async () => {
    const alice = await signUpAndGetSession("Alice", "alice@example.com")
    const bob = await signUpAndGetSession("Bob", "bob@example.com")

    // Alice creates multiple items (including duplicate names)
    const first = await app.request("/api/v1/items", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: alice.cookie },
      body: JSON.stringify({ name: "USB-C Hub" }),
    })
    expect(first.status).toBe(201)
    const firstItem = (await first.json()) as { id: string; userId: number }

    const second = await app.request("/api/v1/items", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: alice.cookie },
      body: JSON.stringify({ name: "USB-C Hub" }),
    })
    expect(second.status).toBe(201)

    // Bob can read Alice's item publicly
    const bobGet = await app.request(`/api/v1/items/${firstItem.id}`, {
      headers: { Cookie: bob.cookie },
    })
    expect(bobGet.status).toBe(200)

    // Bob cannot modify or delete Alice's item
    const bobPatch = await app.request(`/api/v1/items/${firstItem.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: bob.cookie },
      body: JSON.stringify({ name: "Stolen Item" }),
    })
    expect(bobPatch.status).toBe(403)

    const bobDelete = await app.request(`/api/v1/items/${firstItem.id}`, {
      method: "DELETE",
      headers: { Cookie: bob.cookie },
    })
    expect(bobDelete.status).toBe(403)
  })

  it("returns 400 with details on invalid payload or path param", async () => {
    const alice = await signUpAndGetSession("Alice", "alice@example.com")

    const badBodyRes = await app.request("/api/v1/items", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: alice.cookie },
      body: JSON.stringify({ name: "   " }),
    })
    expect(badBodyRes.status).toBe(400)
    const badBody = (await badBodyRes.json()) as {
      statusCode: number
      error: string
      details?: Array<{ path: string; message: string }>
    }
    expect(badBody.statusCode).toBe(400)
    expect(badBody.details?.length).toBeGreaterThanOrEqual(1)

    const badParamRes = await app.request("/api/v1/items/not-a-uuid")
    expect(badParamRes.status).toBe(400)
  })
})
