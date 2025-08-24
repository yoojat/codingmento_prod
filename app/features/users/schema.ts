import {
  boolean,
  date,
  pgEnum,
  pgSchema,
  pgTable,
  text,
  timestamp,
  uuid,
  foreignKey,
} from "drizzle-orm/pg-core";

const users = pgSchema("auth").table("users", {
  id: uuid().primaryKey(),
});

export const gender = pgEnum("gender", ["male", "female", "other"]);

export const lesson_day = pgEnum("lesson_day", [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);
export const lesson_time = pgEnum("lesson_time", [
  "18:00-20:00",
  "20:00-22:00",
  "22:00-24:00",
]);

export const profiles = pgTable("profiles", {
  profile_id: uuid()
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  username: text().notNull(),
  phone: text(),
  birth: date(),
  gender: gender(),
  location: text(),
  comment: text(),
  parent_id: uuid(),
  lesson_day: lesson_day(),
  lesson_time: lesson_time(),
  is_teacher: boolean().notNull().default(false),
  avatar: text(),
  name: text().notNull(),
  headline: text(),
  bio: text(),
  role: text(),
  userId: uuid().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
