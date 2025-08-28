import {
  boolean,
  date,
  pgEnum,
  pgSchema,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
  bigint,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { rooms } from "../lesson/schema";
import { USER_LEVELS } from "./constants";

const users = pgSchema("auth").table("users", {
  id: uuid().primaryKey(),
});

export const gender = pgEnum("gender", ["male", "female", "other"]);

export const user_level = pgEnum(
  "user_level",
  USER_LEVELS.map((level) => level.label) as [string, ...string[]]
);

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
  introduction: text(),
  level: user_level(),
  userId: uuid().references(() => users.id),
  room_id: bigint({ mode: "bigint" }).references((): AnyPgColumn => rooms.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Many-to-many relation between teachers and students (both are profiles)
export const teacherStudents = pgTable(
  "teacher_students",
  {
    teacher_id: uuid("teacher_id")
      .references(() => profiles.profile_id, { onDelete: "cascade" })
      .notNull(),
    student_id: uuid("student_id")
      .references(() => profiles.profile_id, { onDelete: "cascade" })
      .notNull(),
    created_at: timestamp().notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.teacher_id, t.student_id] }),
  })
);

export const teacherStudentsRelations = relations(
  teacherStudents,
  ({ one }) => ({
    teacher: one(profiles, {
      fields: [teacherStudents.teacher_id],
      references: [profiles.profile_id],
      relationName: "teacherStudentsByTeacher",
    }),
    student: one(profiles, {
      fields: [teacherStudents.student_id],
      references: [profiles.profile_id],
      relationName: "teacherStudentsByStudent",
    }),
  })
);

export const profilesRelations = relations(profiles, ({ many }) => ({
  taughtStudents: many(teacherStudents, {
    relationName: "teacherStudentsByTeacher",
  }),
  teachers: many(teacherStudents, { relationName: "teacherStudentsByStudent" }),
}));

// Many-to-many relation between parents and children (both are profiles)
export const parentChildren = pgTable(
  "parent_children",
  {
    parent_id: uuid("parent_id")
      .references(() => profiles.profile_id, { onDelete: "cascade" })
      .notNull(),
    child_id: uuid("child_id")
      .references(() => profiles.profile_id, { onDelete: "cascade" })
      .notNull(),
    created_at: timestamp().notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.parent_id, t.child_id] }),
  })
);

export const parentChildrenRelations = relations(parentChildren, ({ one }) => ({
  parent: one(profiles, {
    fields: [parentChildren.parent_id],
    references: [profiles.profile_id],
    relationName: "parentChildrenByParent",
  }),
  child: one(profiles, {
    fields: [parentChildren.child_id],
    references: [profiles.profile_id],
    relationName: "parentChildrenByChild",
  }),
}));

export const profilesParentChildRelations = relations(profiles, ({ many }) => ({
  children: many(parentChildren, { relationName: "parentChildrenByParent" }),
  parents: many(parentChildren, { relationName: "parentChildrenByChild" }),
}));
