import { pgTable, bigint, text, timestamp } from "drizzle-orm/pg-core";

export const lessonLogs = pgTable("lesson_logs", {
  id: bigint({ mode: "bigint" }).primaryKey().generatedAlwaysAsIdentity(),
  start_at: timestamp().notNull(),
  end_at: timestamp().notNull(),
  user_id: text().notNull(),
  subject: text().notNull(),
  content: text().notNull(),
  class_vibe: text().notNull(),
  student_reactions: text().notNull(),
  img_url: text().notNull(),
  next_week_plan: text().notNull(),
  lesson_id: text().notNull(),
  created_at: timestamp().notNull().defaultNow(),
  updated_at: timestamp().notNull().defaultNow(),
});
