CREATE TYPE "public"."job_type" AS ENUM('full-time', 'part-time', 'remote');--> statement-breakpoint
CREATE TYPE "public"."location" AS ENUM('freelance', 'in-person', 'internship', 'hybrid');--> statement-breakpoint
CREATE TYPE "public"."salary_range" AS ENUM('$0 - $50,000', '$50,000 - $70,000', '$70,000 - $100,000', '$100,000 - $120,000', '$120,000 - $150,000', '$150,000 - $250,000', '$250,000+');--> statement-breakpoint
CREATE TABLE "jobs" (
	"job_id" bigserial PRIMARY KEY NOT NULL,
	"position" text NOT NULL,
	"overview" text NOT NULL,
	"responsibilities" text NOT NULL,
	"qualifications" text NOT NULL,
	"benefits" text NOT NULL,
	"skills" text NOT NULL,
	"company_name" text NOT NULL,
	"company_logo" text NOT NULL,
	"company_location" text NOT NULL,
	"apply_url" text NOT NULL,
	"job_type" "job_type" NOT NULL,
	"location" "location" NOT NULL,
	"salary_range" "salary_range" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
