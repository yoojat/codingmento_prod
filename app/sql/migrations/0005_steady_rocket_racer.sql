CREATE TABLE "lesson_group_students" (
	"lesson_group_id" bigint NOT NULL,
	"student_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_group_students_lesson_group_id_student_id_pk" PRIMARY KEY("lesson_group_id","student_id")
);
--> statement-breakpoint
CREATE TABLE "lesson_groups" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "lesson_groups_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"teacher_id" uuid NOT NULL,
	"name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lesson_group_students" ADD CONSTRAINT "lesson_group_students_lesson_group_id_lesson_groups_id_fk" FOREIGN KEY ("lesson_group_id") REFERENCES "public"."lesson_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_group_students" ADD CONSTRAINT "lesson_group_students_student_id_profiles_profile_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("profile_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_groups" ADD CONSTRAINT "lesson_groups_teacher_id_profiles_profile_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."profiles"("profile_id") ON DELETE no action ON UPDATE no action;