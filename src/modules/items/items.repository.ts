import { and, desc, eq } from "drizzle-orm"
import type { Database } from "@/db"
import type { CreateItemDto, UpdateItemDto } from "./items.dto"
import { type ItemEntity, items } from "./items.entity"

export type CreateItemInput = CreateItemDto & { userId: number }

export interface ItemsRepository {
  findAll(): Promise<ItemEntity[]>
  findById(id: string): Promise<ItemEntity | undefined>
  create(data: CreateItemInput): Promise<ItemEntity>
  update(id: string, userId: number, data: UpdateItemDto): Promise<ItemEntity | undefined>
  delete(id: string, userId: number): Promise<boolean>
}

export class DrizzleItemsRepository implements ItemsRepository {
  constructor(private readonly db: Database) {}

  async findAll(): Promise<ItemEntity[]> {
    return this.db.select().from(items).orderBy(desc(items.createdAt))
  }

  async findById(id: string): Promise<ItemEntity | undefined> {
    const [item] = await this.db.select().from(items).where(eq(items.id, id)).limit(1)
    return item
  }

  async create(data: CreateItemInput): Promise<ItemEntity> {
    const [created] = await this.db.insert(items).values(data).returning()
    if (!created) {
      throw new Error("Failed to create item")
    }
    return created
  }

  async update(id: string, userId: number, data: UpdateItemDto): Promise<ItemEntity | undefined> {
    const [updated] = await this.db
      .update(items)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(items.id, id), eq(items.userId, userId)))
      .returning()
    return updated
  }

  async delete(id: string, userId: number): Promise<boolean> {
    const deleted = await this.db
      .delete(items)
      .where(and(eq(items.id, id), eq(items.userId, userId)))
      .returning({ id: items.id })
    return deleted.length > 0
  }
}
