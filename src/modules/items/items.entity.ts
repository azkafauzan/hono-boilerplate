import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { users } from "@/modules/users/users.entity"

export const items = pgTable(
  "items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("items_user_id_idx").on(table.userId)],
)

export type ItemEntity = typeof items.$inferSelect
export type NewItemEntity = typeof items.$inferInsert
