ALTER TABLE "lesson_membership" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "lesson_membership" CASCADE;--> statement-breakpoint
ALTER TABLE "lesson_logs" ADD COLUMN "payment_id" bigint;--> statement-breakpoint
ALTER TABLE "lesson_logs" ADD CONSTRAINT "lesson_logs_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;