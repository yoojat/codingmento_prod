import { pgTable, bigint, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { lesson_time, profiles } from "~/features/users/schema";
import { lesson_day } from "~/features/users/schema";

export const lessons = pgTable("lessons", {
  id: bigint({ mode: "bigint" }).primaryKey().generatedAlwaysAsIdentity(),
  user_id: uuid()
    .references(() => profiles.profile_id)
    .notNull(),
  teacher_id: uuid()
    .references(() => profiles.profile_id)
    .notNull(),
  comment: text(),
  lesson_day: lesson_day(),
  lesson_time: lesson_time(),
  created_at: timestamp().notNull().defaultNow(),
  updated_at: timestamp().notNull().defaultNow(),
});
