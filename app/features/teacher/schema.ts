import {
  pgTable,
  bigint,
  text,
  timestamp,
  uuid,
  primaryKey,
} from "drizzle-orm/pg-core";
import { profiles } from "~/features/users/schema";
import { payments } from "../lessonmanagement/schema";

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
  profile_id: uuid()
    .references(() => profiles.profile_id)
    .notNull(),
  subject: text(),
  content: text(),
  class_vibe: text(),
  student_reaction: text(),
  img_url: text(),
  next_week_plan: text(),
  payment_id: bigint({ mode: "bigint" }).references(() => payments.id),
  created_at: timestamp().notNull().defaultNow(),
  updated_at: timestamp().notNull().defaultNow(),
});

export const lessonGroups = pgTable("lesson_groups", {
  id: bigint({ mode: "bigint" }).primaryKey().generatedAlwaysAsIdentity(),
  teacher_id: uuid()
    .references(() => profiles.profile_id)
    .notNull(),
  name: text(),
  created_at: timestamp().notNull().defaultNow(),
  updated_at: timestamp().notNull().defaultNow(),
});

export const lessonGroupStudents = pgTable(
  "lesson_group_students",
  {
    lesson_group_id: bigint({ mode: "bigint" })
      .references(() => lessonGroups.id)
      .notNull(),
    student_id: uuid()
      .references(() => profiles.profile_id)
      .notNull(),
    created_at: timestamp().notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.lesson_group_id, t.student_id] }),
  })
);
