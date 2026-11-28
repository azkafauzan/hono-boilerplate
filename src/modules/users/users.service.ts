import { hashPassword } from "better-auth/crypto"
import { ConflictException, NotFoundException } from "@/common/exceptions/http.exception"
import type { CreateUserInput } from "./users.dto"
import type { UserEntity } from "./users.entity"
import type { UsersRepository } from "./users.repository"

function isPgUniqueViolation(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false
  const direct = (err as { code?: unknown }).code
  if (direct === "23505") return true
  const cause = (err as { cause?: unknown }).cause
  return (
    typeof cause === "object" && cause !== null && (cause as { code?: unknown }).code === "23505"
  )
}

export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findById(id: number): Promise<UserEntity> {
    const user = await this.usersRepository.findById(id)
    if (!user) {
      throw new NotFoundException(`User ${id} not found`)
    }
    return user
  }

  async findByEmail(email: string): Promise<UserEntity | undefined> {
    return this.usersRepository.findByEmail(email.trim().toLowerCase())
  }

  async create(input: CreateUserInput): Promise<UserEntity> {
    const name = input.name.trim()
    const email = input.email.trim().toLowerCase()

    const existing = await this.usersRepository.findByEmail(email)
    if (existing) {
      throw new ConflictException("Email already registered")
    }

    const passwordHash = await hashPassword(input.password)
    try {
      return await this.usersRepository.createWithCredential({
        name,
        email,
        passwordHash,
      })
    } catch (err) {
      if (isPgUniqueViolation(err)) {
        throw new ConflictException("Email already registered")
      }
      throw err
    }
  }
}
