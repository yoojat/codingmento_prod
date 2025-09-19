import {
  pgEnum,
  pgTable,
  bigint,
  integer,
  text,
  varchar,
  timestamp,
} from "drizzle-orm/pg-core";

export const fileType = pgEnum("file_type", ["folder", "file"]);

export const files = pgTable("files", {
  id: bigint({ mode: "bigint" }).primaryKey().generatedAlwaysAsIdentity(),
  profile_id: integer().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: fileType("type").notNull(),
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
