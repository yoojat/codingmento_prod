CREATE TABLE "parent_children" (
	"parent_id" uuid NOT NULL,
	"child_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "parent_children_parent_id_child_id_pk" PRIMARY KEY("parent_id","child_id")
);
--> statement-breakpoint
ALTER TABLE "parent_children" ADD CONSTRAINT "parent_children_parent_id_profiles_profile_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."profiles"("profile_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_children" ADD CONSTRAINT "parent_children_child_id_profiles_profile_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."profiles"("profile_id") ON DELETE cascade ON UPDATE no action;