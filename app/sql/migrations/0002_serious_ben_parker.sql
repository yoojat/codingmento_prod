CREATE TABLE "teacher_students" (
	"teacher_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "teacher_students_teacher_id_student_id_pk" PRIMARY KEY("teacher_id","student_id")
);
--> statement-breakpoint
DROP TABLE "relationship" CASCADE;--> statement-breakpoint
ALTER TABLE "teacher_students" ADD CONSTRAINT "teacher_students_teacher_id_profiles_profile_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."profiles"("profile_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_students" ADD CONSTRAINT "teacher_students_student_id_profiles_profile_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("profile_id") ON DELETE cascade ON UPDATE no action;