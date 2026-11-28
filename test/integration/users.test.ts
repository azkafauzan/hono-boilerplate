import { afterAll, afterEach, beforeEach, describe, expect, it } from "bun:test"
import { verifyPassword } from "better-auth/crypto"
import { eq } from "drizzle-orm"
import { ConflictException, NotFoundException } from "@/common/exceptions/http.exception"
import { accounts } from "@/db/schema"
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
})
