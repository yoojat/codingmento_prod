ALTER TABLE "lesson_logs" RENAME COLUMN "user_id" TO "profile_id";--> statement-breakpoint
ALTER TABLE "lesson_logs" DROP CONSTRAINT "lesson_logs_user_id_profiles_profile_id_fk";
--> statement-breakpoint
ALTER TABLE "lesson_logs" ADD CONSTRAINT "lesson_logs_profile_id_profiles_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("profile_id") ON DELETE no action ON UPDATE no action;