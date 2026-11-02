import { describe, expect, it, spyOn } from "bun:test"
import { createApp } from "@/app"
import { db, verifyDbConnection } from "@/db"

const app = createApp()

describe("App Endpoints", () => {
  it("verifyDbConnection should resolve when database is reachable and reject when down", async () => {
    const executeSpy = spyOn(db, "execute").mockResolvedValueOnce({} as never)
    await expect(verifyDbConnection()).resolves.toBeUndefined()

    executeSpy.mockRejectedValueOnce(new Error("Connection refused"))
    await expect(verifyDbConnection()).rejects.toThrow("Connection refused")

    executeSpy.mockRestore()
  })

  it("GET / should return basic info and security headers", async () => {
    const res = await app.request("/")
    expect(res.status).toBe(200)
    expect(res.headers.get("x-content-type-options")).toBe("nosniff")
    const body = await res.json()
    expect(body.name).toBe("hono-boilerplate")
    expect(body.docs).toBe("/swagger")
  })

  it("GET /doc should return openapi spec", async () => {
    const res = await app.request("/doc")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.openapi).toBe("3.0.0")
    expect(body.info.title).toBe("Hono Boilerplate API")
    expect(body.paths["/items"]).toBeDefined()
    expect(body.paths["/items/{id}"]).toBeDefined()
  })

  it("GET /health should return 200 when database is connected", async () => {
    const executeSpy = spyOn(db, "execute").mockResolvedValueOnce({} as never)

    const res = await app.request("/health")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.status).toBe("ok")
    expect(body.data.database).toBe("connected")

    executeSpy.mockRestore()
  })

  it("GET /health should return 503 when database is unreachable", async () => {
    const executeSpy = spyOn(db, "execute").mockRejectedValueOnce(new Error("DB connection failed"))

    const res = await app.request("/health")
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error.status).toBe("degraded")
    expect(body.error.database).toBe("disconnected")

    executeSpy.mockRestore()
  })

  it("GET /not-found-route should return 404 with standard json", async () => {
    const res = await app.request("/not-found-route")
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.message).toContain("Route not found")
  })
})
