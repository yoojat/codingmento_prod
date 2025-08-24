CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'other');--> statement-breakpoint
CREATE TYPE "public"."lesson_day" AS ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');--> statement-breakpoint
CREATE TYPE "public"."lesson_time" AS ENUM('18:00-20:00', '20:00-22:00', '22:00-24:00');--> statement-breakpoint
CREATE TABLE "profiles" (
	"profile_id" uuid PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"phone" text,
	"birth" date,
	"gender" "gender",
	"location" text,
	"comment" text,
	"parent_id" uuid,
	"lesson_day" "lesson_day",
	"lesson_time" "lesson_time",
	"is_teacher" boolean DEFAULT false NOT NULL,
	"avatar" text,
	"name" text NOT NULL,
	"headline" text,
	"bio" text,
	"role" text,
	"userId" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_profile_id_users_id_fk" FOREIGN KEY ("profile_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;