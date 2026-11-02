import { z } from "@hono/zod-openapi"
import { createSchemaFactory } from "drizzle-zod"
import { items } from "@/db/schema"

const { createSelectSchema, createInsertSchema } = createSchemaFactory({ zodInstance: z })

const timestampExample = "2026-01-01T00:00:00.000Z"

export const ItemSchema = createSelectSchema(items, {
  id: (schema) => schema.openapi({ example: 1 }),
  item: (schema) => schema.openapi({ example: "Laptop" }),
  quantity: (schema) => schema.openapi({ example: 10 }),
  createdAt: z.iso.datetime().openapi({ example: timestampExample }),
  updatedAt: z.iso.datetime().openapi({ example: timestampExample }),
}).openapi("Item")

export const CreateItemSchema = createInsertSchema(items, {
  item: (schema) => schema.min(1, "Item name is required").openapi({ example: "Laptop" }),
  quantity: (schema) =>
    schema.int().min(0, "Quantity must be a non-negative integer").openapi({ example: 10 }),
})
  // `id` is a GENERATED ALWAYS identity column, so drizzle-zod already excludes it
  .omit({ createdAt: true, updatedAt: true })
  .openapi("CreateItemInput")

// drizzle-zod marks columns with DB defaults as optional *without* a Zod `.default()`,
// so `.partial()` never injects values the client didn't send (e.g. quantity = 0).
export const UpdateItemSchema = CreateItemSchema.partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  })
  .openapi("UpdateItemInput")

export type CreateItemInput = z.infer<typeof CreateItemSchema>
export type UpdateItemInput = z.infer<typeof UpdateItemSchema>
