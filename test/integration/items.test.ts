import { afterAll, afterEach, beforeEach, describe, expect, it } from "bun:test"
import { eq } from "drizzle-orm"
import { ForbiddenException, NotFoundException } from "@/common/exceptions/http.exception"
import { users } from "@/db/schema"
import { DrizzleItemsRepository } from "@/modules/items/items.repository"
import { ItemsService } from "@/modules/items/items.service"
import { cleanupTestDb, createTestDb } from "../helper/db"

describe("ItemsService", () => {
  const db = createTestDb()
  const service = new ItemsService(new DrizzleItemsRepository(db))

  async function seedUser(email: string, name = "Test User") {
    const [created] = await db.insert(users).values({ name, email }).returning()
    if (!created) throw new Error("Failed to seed user")
    return created
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

  it("creates, updates, deletes, and retrieves items owned by a user", async () => {
    const owner = await seedUser("owner@example.com")

    const created = await service.create(owner.id, { name: "Mechanical Keyboard" })
    expect(created.userId).toBe(owner.id)

    const found = await service.findById(created.id)
    expect(found.name).toBe("Mechanical Keyboard")
    expect(found.userId).toBe(owner.id)

    const updated = await service.update(created.id, owner.id, { name: "Wireless Mouse" })
    expect(updated.name).toBe("Wireless Mouse")

    await service.remove(created.id, owner.id)
    await expect(service.findById(created.id)).rejects.toBeInstanceOf(NotFoundException)
  })

  it("allows one user to own many items including duplicate names", async () => {
    const owner = await seedUser("multi@example.com")

    const first = await service.create(owner.id, { name: "USB-C Cable" })
    const second = await service.create(owner.id, { name: "USB-C Cable" })

    expect(first.id).not.toBe(second.id)
    expect(first.userId).toBe(owner.id)
    expect(second.userId).toBe(owner.id)
    expect(await service.findAll()).toHaveLength(2)
  })

  it("forbids modifying or deleting another user's item", async () => {
    const owner = await seedUser("alice@example.com", "Alice")
    const other = await seedUser("bob@example.com", "Bob")

    const item = await service.create(owner.id, { name: "Alice Item" })

    await expect(service.update(item.id, other.id, { name: "Hijacked" })).rejects.toBeInstanceOf(
      ForbiddenException,
    )
    await expect(service.remove(item.id, other.id)).rejects.toBeInstanceOf(ForbiddenException)
  })

  it("cascades item deletion when owning user is deleted", async () => {
    const owner = await seedUser("cascade@example.com")
    await service.create(owner.id, { name: "Cascade Item" })
    expect(await service.findAll()).toHaveLength(1)

    await db.delete(users).where(eq(users.id, owner.id))
    expect(await service.findAll()).toHaveLength(0)
  })

  it("throws NotFoundException for unknown item ID", async () => {
    await expect(service.findById(crypto.randomUUID())).rejects.toBeInstanceOf(NotFoundException)
  })
})
