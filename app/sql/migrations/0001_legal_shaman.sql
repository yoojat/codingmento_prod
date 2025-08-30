ALTER TABLE "payments" RENAME COLUMN "user_id" TO "profile_id";--> statement-breakpoint
ALTER TABLE "payments" DROP CONSTRAINT "payments_user_id_profiles_profile_id_fk";
--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_profile_id_profiles_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("profile_id") ON DELETE no action ON UPDATE no action;