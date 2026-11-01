import { count, desc, eq } from "drizzle-orm"
import { db } from "../../db"
import type { PaginationQuery } from "../../lib/schemas"
import type { CreateItemInput, UpdateItemInput } from "./items.schema"
import { items } from "./items.table"

export const itemsService = {
  async findAll({ page, limit }: PaginationQuery) {
    const offset = (page - 1) * limit

    const [data, [{ total }]] = await Promise.all([
      db.select().from(items).orderBy(desc(items.createdAt)).limit(limit).offset(offset),
      db.select({ total: count() }).from(items),
    ])

    return { data, total }
  },

  async findById(id: number) {
    const [item] = await db.select().from(items).where(eq(items.id, id)).limit(1)
    return item ?? null
  },

  async create(data: CreateItemInput) {
    const [item] = await db.insert(items).values(data).returning()
    return item
  },

  async update(id: number, data: UpdateItemInput) {
    const [item] = await db.update(items).set(data).where(eq(items.id, id)).returning()
    return item ?? null
  },

  async remove(id: number) {
    const [item] = await db.delete(items).where(eq(items.id, id)).returning()
    return item ?? null
  },
}

