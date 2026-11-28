import { z } from "@hono/zod-openapi"
import { UserResponseSchema } from "@/modules/users/users.dto"
import { isStrongPassword, STRONG_PASSWORD_MESSAGE } from "./auth.config"

export const StrongPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters")
  .refine(isStrongPassword, { message: STRONG_PASSWORD_MESSAGE })

export const SignUpDtoSchema = z
  .object({
    name: z.string().trim().min(1).max(100).openapi({ example: "Alice" }),
    email: z.email().trim().toLowerCase().openapi({ example: "alice@example.com" }),
    password: StrongPasswordSchema.openapi({ example: "Str0ng!Password" }),
  })
  .openapi("SignUpDto")

export const SignInDtoSchema = z
  .object({
    email: z.email().trim().toLowerCase().openapi({ example: "alice@example.com" }),
    password: z.string().min(1).max(128).openapi({ example: "Str0ng!Password" }),
    rememberMe: z.boolean().optional().openapi({ example: true }),
  })
  .openapi("SignInDto")

export const ResetPasswordDtoSchema = z
  .object({
    currentPassword: z.string().min(1).max(128).openapi({ example: "Str0ng!Password" }),
    newPassword: StrongPasswordSchema.openapi({ example: "NewStr0ng!Pass1" }),
    revokeOtherSessions: z.boolean().optional().openapi({ example: true }),
  })
  .openapi("ResetPasswordDto")

export const AuthResponseSchema = z
  .object({
    user: UserResponseSchema,
  })
  .openapi("AuthResponse")

export const AuthSessionResponseSchema = z
  .object({
    id: z.string().openapi({ example: "1" }),
    expiresAt: z.iso.datetime().openapi({ example: "2026-12-05T00:00:00.000Z" }),
  })
  .openapi("AuthSession")

export const AuthMeResponseSchema = z
  .object({
    user: UserResponseSchema,
    session: AuthSessionResponseSchema,
  })
  .openapi("AuthMeResponse")

export const AuthMessageResponseSchema = z
  .object({
    message: z.string().openapi({ example: "Signed out successfully" }),
  })
  .openapi("AuthMessageResponse")

export type SignUpDto = z.infer<typeof SignUpDtoSchema>
export type SignInDto = z.infer<typeof SignInDtoSchema>
export type ResetPasswordDto = z.infer<typeof ResetPasswordDtoSchema>
