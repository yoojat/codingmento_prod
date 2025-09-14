import {
  pgTable,
  bigint,
  text,
  timestamp,
  uuid,
  pgEnum,
  integer,
  varchar,
  boolean,
} from "drizzle-orm/pg-core";
import { profiles } from "~/features/users/schema";

export const lessonLogs = pgTable("lesson_logs", {
  id: bigint({ mode: "bigint" }).primaryKey().generatedAlwaysAsIdentity(),
  start_at: timestamp(),
  end_at: timestamp(),
  profile_id: uuid()
    .references(() => profiles.profile_id, { onDelete: "cascade" })
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

export const fileType = pgEnum("file_type", ["folder", "file"]);

export const files = pgTable("files", {
  id: bigint({ mode: "bigint" }).primaryKey().generatedAlwaysAsIdentity(),
  profile_id: uuid()
    .references(() => profiles.profile_id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: fileType().notNull(),
  parent_id: bigint({ mode: "bigint" }),
  path: text(),
  size: bigint({ mode: "bigint" }),
  mime_type: varchar("mime_type", { length: 100 }),
  created_at: timestamp().notNull().defaultNow(),
  updated_at: timestamp().notNull().defaultNow(),
});

export const fileContents = pgTable("file_contents", {
  id: bigint({ mode: "bigint" })
    .primaryKey()
    .references(() => files.id),
  content: text(),
  version: integer().default(1),
});

export const rooms = pgTable("rooms", {
  id: bigint({ mode: "bigint" }).primaryKey().generatedAlwaysAsIdentity(),
  room_name: text("room_name"),
  user_id: uuid().references(() => profiles.profile_id),
  created_at: timestamp().notNull().defaultNow(),
});

export const messageRoomMembers = pgTable("message_room_members", {
  id: bigint({ mode: "bigint" }).primaryKey().generatedAlwaysAsIdentity(),
  user_id: uuid()
    .references(() => profiles.profile_id)
    .notNull(),
  created_at: timestamp().notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: bigint({ mode: "bigint" }).primaryKey().generatedAlwaysAsIdentity(),
  message_room_id: bigint({ mode: "bigint" })
    .references(() => rooms.id)
    .notNull(),
  content: text(),
  sender_id: uuid()
    .references(() => profiles.profile_id)
    .notNull(),
  created_at: timestamp().notNull().defaultNow(),
});
