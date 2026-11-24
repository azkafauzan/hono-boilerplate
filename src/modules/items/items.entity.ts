import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

export const items = pgTable("items", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export type ItemEntity = typeof items.$inferSelect
export type NewItemEntity = typeof items.$inferInsert
