import { afterAll, afterEach, beforeEach, describe, expect, it } from "bun:test"
import { verifyPassword } from "better-auth/crypto"
import { eq } from "drizzle-orm"
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@/common/exceptions/http.exception"
import { accounts, items, sessions } from "@/db/schema"
import { DrizzleUsersRepository } from "@/modules/users/users.repository"
import { UsersService } from "@/modules/users/users.service"
import { cleanupTestDb, createTestDb } from "../helper/db"

describe("UsersService", () => {
  const db = createTestDb()
  const service = new UsersService(new DrizzleUsersRepository(db))

  beforeEach(async () => {
    await cleanupTestDb(db)
  })

  afterEach(async () => {
    await cleanupTestDb(db)
  })

  afterAll(async () => {
    await db.$client.end()
  })

  it("creates user with auto-increment ID, normalized email, and hashed credential account", async () => {
    const created = await service.create({
      name: "  Alice  ",
      email: "  Alice@Example.COM ",
      password: "Str0ng!Password",
    })

    expect(Number.isSafeInteger(created.id) && created.id > 0).toBe(true)
    expect(created.name).toBe("Alice")
    expect(created.email).toBe("alice@example.com")

    const found = await service.findById(created.id)
    expect(found.email).toBe("alice@example.com")

    const [cred] = await db.select().from(accounts).where(eq(accounts.userId, created.id)).limit(1)
    expect(cred?.providerId).toBe("credential")
    expect(cred?.accountId).toBe(String(created.id))
    expect(cred?.password).toBeTruthy()
    expect(cred?.password).not.toBe("Str0ng!Password")
    expect(await verifyPassword({ hash: cred?.password ?? "", password: "Str0ng!Password" })).toBe(
      true,
    )
  })

  it("throws ConflictException on duplicate email (case-insensitive)", async () => {
    await service.create({
      name: "Alice",
      email: "alice@example.com",
      password: "Str0ng!Password",
    })

    await expect(
      service.create({
        name: "Alice 2",
        email: "ALICE@example.com",
        password: "Str0ng!Password",
      }),
    ).rejects.toBeInstanceOf(ConflictException)
  })

  it("throws NotFoundException when user ID does not exist", async () => {
    await expect(service.findById(999_999)).rejects.toBeInstanceOf(NotFoundException)
  })

  it("updates a user's name and rejects empty names or unknown IDs", async () => {
    const created = await service.create({
      name: "Alice",
      email: "alice@example.com",
      password: "Str0ng!Password",
    })

    const updated = await service.updateName(created.id, { name: "  Alice Updated  " })
    expect(updated.id).toBe(created.id)
    expect(updated.name).toBe("Alice Updated")
    expect(updated.email).toBe("alice@example.com")

    const reloaded = await service.findById(created.id)
    expect(reloaded.name).toBe("Alice Updated")

    await expect(service.updateName(created.id, { name: "   " })).rejects.toBeInstanceOf(
      BadRequestException,
    )
    await expect(service.updateName(999_999, { name: "Ghost" })).rejects.toBeInstanceOf(
      NotFoundException,
    )
  })

  it("deletes user and cascades deletion to owned items, sessions, and accounts without affecting other users", async () => {
    const alice = await service.create({
      name: "Alice",
      email: "alice@example.com",
      password: "Str0ng!Password",
    })
    const bob = await service.create({
      name: "Bob",
      email: "bob@example.com",
      password: "Str0ng!Password",
    })

    await db.insert(items).values([
      { name: "Alice Keyboard", userId: alice.id },
      { name: "Alice Mouse", userId: alice.id },
      { name: "Bob Monitor", userId: bob.id },
    ])
    await db.insert(sessions).values({
      token: "alice-session-token",
      userId: alice.id,
      expiresAt: new Date(Date.now() + 60_000),
    })

    await service.remove(alice.id)

    await expect(service.findById(alice.id)).rejects.toBeInstanceOf(NotFoundException)
    expect(await db.select().from(items).where(eq(items.userId, alice.id))).toHaveLength(0)
    expect(await db.select().from(sessions).where(eq(sessions.userId, alice.id))).toHaveLength(0)
    expect(await db.select().from(accounts).where(eq(accounts.userId, alice.id))).toHaveLength(0)

    const bobItems = await db.select().from(items).where(eq(items.userId, bob.id))
    expect(bobItems).toHaveLength(1)
    expect(bobItems[0]?.name).toBe("Bob Monitor")

    await expect(service.remove(alice.id)).rejects.toBeInstanceOf(NotFoundException)
  })
})
