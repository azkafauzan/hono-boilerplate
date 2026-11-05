import { timestamp } from "drizzle-orm/pg-core"

/** Reusable `created_at` / `updated_at` columns. Spread into any table definition. */
export const timestamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}
