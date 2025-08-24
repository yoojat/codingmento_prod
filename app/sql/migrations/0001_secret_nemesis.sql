CREATE TYPE "public"."user_level" AS ENUM('code-explorer', 'code-pioneer', 'code-solver', 'code-trailblazer', 'code-conqueror');--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "introduction" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "level" "user_level";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "headline";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "bio";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "role";