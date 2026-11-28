import { relations } from "drizzle-orm"
import { accounts, sessions } from "@/modules/auth/auth.entity"
import { items } from "@/modules/items/items.entity"
import { users } from "@/modules/users/users.entity"

export * from "@/modules/auth/auth.entity"
export * from "@/modules/items/items.entity"
export * from "@/modules/users/users.entity"

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  items: many(items),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}))

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}))

export const itemsRelations = relations(items, ({ one }) => ({
  user: one(users, {
    fields: [items.userId],
    references: [users.id],
  }),
}))
