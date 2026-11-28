import { z } from "@hono/zod-openapi"
import { createSelectSchema } from "@/db/zod"
import { type UserEntity, users } from "./users.entity"

export const UserIdParamSchema = z.object({
  id: z.coerce
    .number()
    .int()
    .positive()
    .openapi({
      param: { name: "id", in: "path" },
      example: 1,
    }),
})

export const UserResponseSchema = createSelectSchema(users, {
  id: z.number().int().positive().openapi({ example: 1 }),
  name: z.string().openapi({ example: "Alice" }),
  email: z.email().openapi({ example: "alice@example.com" }),
  emailVerified: z.boolean().openapi({ example: false }),
  image: z.string().nullable().openapi({ example: null }),
  createdAt: z.iso.datetime().openapi({ example: "2026-11-28T00:00:00.000Z" }),
  updatedAt: z.iso.datetime().openapi({ example: "2026-11-28T00:00:00.000Z" }),
}).openapi("User")

export interface CreateUserInput {
  name: string
  email: string
  password: string
}

export type UserResponse = z.infer<typeof UserResponseSchema>

export function toUserResponse(entity: UserEntity): UserResponse {
  return {
    id: entity.id,
    name: entity.name,
    email: entity.email,
    emailVerified: entity.emailVerified,
    image: entity.image,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  }
}
