import { eq } from "drizzle-orm"
import type { Database } from "@/db"
import { accounts } from "@/modules/auth/auth.entity"
import { type UserEntity, users } from "./users.entity"

export interface CreateUserWithCredentialInput {
  name: string
  email: string
  passwordHash: string
}

export interface UsersRepository {
  findById(id: number): Promise<UserEntity | undefined>
  findByEmail(email: string): Promise<UserEntity | undefined>
  createWithCredential(data: CreateUserWithCredentialInput): Promise<UserEntity>
  updateName(id: number, name: string): Promise<UserEntity | undefined>
  delete(id: number): Promise<boolean>
}

export class DrizzleUsersRepository implements UsersRepository {
  constructor(private readonly db: Database) {}

  async findById(id: number): Promise<UserEntity | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id)).limit(1)
    return user
  }

  async findByEmail(email: string): Promise<UserEntity | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.email, email)).limit(1)
    return user
  }

  async createWithCredential(data: CreateUserWithCredentialInput): Promise<UserEntity> {
    return this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(users)
        .values({
          name: data.name,
          email: data.email,
        })
        .returning()

      if (!created) {
        throw new Error("Failed to create user")
      }

      await tx.insert(accounts).values({
        accountId: String(created.id),
        providerId: "credential",
        userId: created.id,
        password: data.passwordHash,
      })

      return created
    })
  }

  async updateName(id: number, name: string): Promise<UserEntity | undefined> {
    const [updated] = await this.db
      .update(users)
      .set({ name, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning()
    return updated
  }

  async delete(id: number): Promise<boolean> {
    // Owned items, sessions, and accounts are removed atomically via FK ON DELETE CASCADE.
    const deleted = await this.db.delete(users).where(eq(users.id, id)).returning({ id: users.id })
    return deleted.length > 0
  }
}
