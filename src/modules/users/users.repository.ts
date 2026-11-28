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
}
