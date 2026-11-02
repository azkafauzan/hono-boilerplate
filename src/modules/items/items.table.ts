import { integer, pgTable, text } from "drizzle-orm/pg-core"
import { timestamps } from "@/db/columns"

export const items = pgTable("items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  item: text("item").notNull(),
  quantity: integer("quantity").notNull().default(0),
  ...timestamps,
})

export type Item = typeof items.$inferSelect
export type NewItem = typeof items.$inferInsert
