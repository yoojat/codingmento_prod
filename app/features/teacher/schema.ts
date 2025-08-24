import { pgTable, bigint, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { profiles } from "~/features/users/schema";

export const lessons = pgTable("lessons", {
  id: bigint({ mode: "bigint" }).primaryKey().generatedAlwaysAsIdentity(),
  user_id: uuid()
    .references(() => profiles.profile_id)
    .notNull(),
  teacher_id: uuid()
    .references(() => profiles.profile_id)
    .notNull(),
  comment: text(),
  lesson_time: timestamp().notNull(),
  created_at: timestamp().notNull().defaultNow(),
  updated_at: timestamp().notNull().defaultNow(),
});

export const lessonLogs = pgTable("lesson_logs", {
  id: bigint({ mode: "bigint" }).primaryKey().generatedAlwaysAsIdentity(),
  start_at: timestamp(),
  end_at: timestamp(),
  user_id: uuid()
    .references(() => profiles.profile_id)
    .notNull(),
  subject: text(),
  content: text(),
  class_vibe: text(),
  student_reaction: text(),
  img_url: text(),
  next_week_plan: text(),
  created_at: timestamp().notNull().defaultNow(),
  updated_at: timestamp().notNull().defaultNow(),
});
