import { z } from "@hono/zod-openapi"

export const ValidationIssueSchema = z.object({
  path: z.string().openapi({ example: "email" }),
  message: z.string().openapi({ example: "Invalid email address" }),
})

export const ErrorResponseSchema = z
  .object({
    statusCode: z.number().int().openapi({ example: 400 }),
    error: z.string().openapi({ example: "Bad Request" }),
    message: z.string().openapi({ example: "Validation failed" }),
    requestId: z.string().optional().openapi({ example: "0194f0c4-0000-7000-8000-000000000000" }),
    details: z.array(ValidationIssueSchema).optional(),
  })
  .openapi("ErrorResponse")

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>
