import {
  pgTable,
  bigint,
  integer,
  timestamp,
  uuid,
  varchar,
  boolean,
} from "drizzle-orm/pg-core";
import { profiles } from "~/features/users/schema";

export const payments = pgTable("payments", {
  id: bigint({ mode: "bigint" }).primaryKey().generatedAlwaysAsIdentity(),
  amount: integer().notNull(),
  lesson_count: integer().notNull(),
  profile_id: uuid()
    .references(() => profiles.profile_id)
    .notNull(),
  product_id: bigint({ mode: "bigint" }).references(() => products.id),
  created_at: timestamp().notNull().defaultNow(),
});

export const products = pgTable("products", {
  id: bigint({ mode: "bigint" }).primaryKey().generatedAlwaysAsIdentity(),
  amount: integer().notNull(),
  name: varchar("name", { length: 255 }),
  lesson_count: integer(),
});
