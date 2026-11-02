import { describe, expect, it, spyOn } from "bun:test"
import { createApp } from "@/app"
import { itemsService } from "@/modules/items/items.service"

const app = createApp()

describe("Items E2E", () => {
  it("POST /items should return 422 with standard ApiErrorResponse on invalid payload", async () => {
    const res = await app.request("/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item: "", quantity: -5 }),
    })

    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.message).toBe("Validation failed")
    expect(body.error).toBeDefined()
  })

  it("GET /items/{id} should return 422 when id param is not a positive integer", async () => {
    const res = await app.request("/items/invalid-id")
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.message).toBe("Validation failed")
  })

  it("PUT /items/{id} should return 422 when body is empty", async () => {
    const updateSpy = spyOn(itemsService, "update")

    const res = await app.request("/items/1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.message).toBe("Validation failed")
    expect(updateSpy).not.toHaveBeenCalled()

    updateSpy.mockRestore()
  })

  it("PUT /items/{id} should only update provided fields (no default injection)", async () => {
    const now = new Date()
    const updateSpy = spyOn(itemsService, "update").mockResolvedValueOnce({
      id: 1,
      item: "Renamed",
      quantity: 7,
      createdAt: now,
      updatedAt: now,
    })

    const res = await app.request("/items/1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item: "Renamed" }),
    })

    expect(res.status).toBe(200)
    expect(updateSpy).toHaveBeenCalledWith(1, { item: "Renamed" })
    const body = await res.json()
    expect(body.data.quantity).toBe(7)

    updateSpy.mockRestore()
  })
})

