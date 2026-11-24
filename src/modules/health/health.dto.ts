import { z } from "@hono/zod-openapi"

export const HealthResponseSchema = z
  .object({
    status: z.literal("ok").openapi({ example: "ok" }),
    uptime: z.number().openapi({ example: 42.12 }),
    timestamp: z.iso.datetime().openapi({ example: "2026-11-24T00:00:00.000Z" }),
  })
  .openapi("HealthResponse")

export type HealthResponse = z.infer<typeof HealthResponseSchema>
