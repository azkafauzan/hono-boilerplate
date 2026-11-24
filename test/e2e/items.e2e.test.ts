import { afterAll, afterEach, beforeEach, describe, expect, it } from "bun:test"
import { createTestApp } from "../helper/create-test-app"
import { cleanupTestDb, createTestDb } from "../helper/db"

describe("ItemsModule E2E", () => {
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

  it("runs full CRUD lifecycle over HTTP", async () => {
    const createRes = await app.request("/api/v1/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "  Mechanical Keyboard  ",
      }),
    })
    expect(createRes.status).toBe(201)
    const created = (await createRes.json()) as {
      id: string
      name: string
      createdAt: string
      updatedAt: string
    }
    expect(created.name).toBe("Mechanical Keyboard")
    expect(Date.parse(created.createdAt)).not.toBeNaN()
    expect(Date.parse(created.updatedAt)).not.toBeNaN()

    const listRes = await app.request("/api/v1/items")
    expect(listRes.status).toBe(200)
    const listBody = (await listRes.json()) as { data: Array<{ id: string }> }
    expect(listBody.data).toHaveLength(1)

    const getRes = await app.request(`/api/v1/items/${created.id}`)
    expect(getRes.status).toBe(200)

    const patchRes = await app.request(`/api/v1/items/${created.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Ergonomic Keyboard" }),
    })
    expect(patchRes.status).toBe(200)
    const updated = (await patchRes.json()) as { name: string }
    expect(updated.name).toBe("Ergonomic Keyboard")

    const deleteRes = await app.request(`/api/v1/items/${created.id}`, {
      method: "DELETE",
    })
    expect(deleteRes.status).toBe(204)

    const afterDeleteRes = await app.request(`/api/v1/items/${created.id}`)
    expect(afterDeleteRes.status).toBe(404)
  })

  it("allows creating items with duplicate names", async () => {
    const payload = JSON.stringify({ name: "USB-C Hub" })
    const first = await app.request("/api/v1/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    })
    expect(first.status).toBe(201)

    const second = await app.request("/api/v1/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    })
    expect(second.status).toBe(201)
  })

  it("returns 400 with details on invalid payload or path param", async () => {
    const badBodyRes = await app.request("/api/v1/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
