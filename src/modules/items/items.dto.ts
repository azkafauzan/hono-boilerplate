import { z } from "@hono/zod-openapi"
import { createInsertSchema, createSelectSchema } from "@/db/zod"
import { type ItemEntity, items } from "./items.entity"

export const ItemIdParamSchema = z.object({
  id: z.uuid().openapi({
    param: { name: "id", in: "path" },
    example: "0194f0c4-0000-7000-8000-000000000000",
  }),
})

export const ItemResponseSchema = createSelectSchema(items, {
  id: z.uuid().openapi({ example: "0194f0c4-0000-7000-8000-000000000000" }),
  name: z.string().openapi({ example: "Mechanical Keyboard" }),
  createdAt: z.iso.datetime().openapi({ example: "2026-11-24T00:00:00.000Z" }),
  updatedAt: z.iso.datetime().openapi({ example: "2026-11-24T00:00:00.000Z" }),
}).openapi("Item")

export const ItemListResponseSchema = z
  .object({
    data: z.array(ItemResponseSchema),
  })
  .openapi("ItemListResponse")

export const CreateItemDtoSchema = createInsertSchema(items, {
  name: (schema) => schema.trim().min(1).max(100).openapi({ example: "Mechanical Keyboard" }),
})
  .omit({ id: true, createdAt: true, updatedAt: true })
  .openapi("CreateItemDto")

export const UpdateItemDtoSchema = CreateItemDtoSchema.partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  })
  .openapi("UpdateItemDto")

export type ItemResponse = z.infer<typeof ItemResponseSchema>
export type CreateItemDto = z.infer<typeof CreateItemDtoSchema>
export type UpdateItemDto = z.infer<typeof UpdateItemDtoSchema>

export function toItemResponse(entity: ItemEntity): ItemResponse {
  return {
    id: entity.id,
    name: entity.name,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  }
}
