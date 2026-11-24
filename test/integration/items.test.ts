import { afterAll, afterEach, beforeEach, describe, expect, it } from "bun:test"
import { NotFoundException } from "@/common/exceptions/http.exception"
import { DrizzleItemsRepository } from "@/modules/items/items.repository"
import { ItemsService } from "@/modules/items/items.service"
import { cleanupTestDb, createTestDb } from "../helper/db"

describe("ItemsService", () => {
  const db = createTestDb()
  const service = new ItemsService(new DrizzleItemsRepository(db))

  beforeEach(async () => {
    await cleanupTestDb(db)
  })

  afterEach(async () => {
    await cleanupTestDb(db)
  })

  afterAll(async () => {
    await db.$client.end()
  })

  it("creates, updates, deletes, and retrieves items", async () => {
    const created = await service.create({ name: "Mechanical Keyboard" })
    const found = await service.findById(created.id)
    expect(found.name).toBe("Mechanical Keyboard")

    const updated = await service.update(created.id, { name: "Wireless Mouse" })
    expect(updated.name).toBe("Wireless Mouse")

    await service.remove(created.id)
    await expect(service.findById(created.id)).rejects.toBeInstanceOf(NotFoundException)
  })

  it("allows items with duplicate names", async () => {
    const first = await service.create({ name: "USB-C Cable" })
    const second = await service.create({ name: "USB-C Cable" })

    expect(first.id).not.toBe(second.id)
    expect(await service.findAll()).toHaveLength(2)
  })

  it("throws NotFoundException for unknown item ID", async () => {
    await expect(service.findById(crypto.randomUUID())).rejects.toBeInstanceOf(NotFoundException)
  })
})
