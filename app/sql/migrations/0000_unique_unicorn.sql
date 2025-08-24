CREATE TABLE "lesson_logs" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "lesson_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"start_at" timestamp NOT NULL,
	"end_at" timestamp NOT NULL,
	"user_id" text NOT NULL,
	"subject" text NOT NULL,
	"content" text NOT NULL,
	"class_vibe" text NOT NULL,
	"student_reactions" text NOT NULL,
	"img_url" text NOT NULL,
	"next_week_plan" text NOT NULL,
	"lesson_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
