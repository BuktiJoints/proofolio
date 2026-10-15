CREATE TABLE "portfolio_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "portfolio_shares_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "rubric_versions" ADD COLUMN "program_keahlian" varchar(180);--> statement-breakpoint
ALTER TABLE "rubric_versions" ADD COLUMN "partner_name" varchar(180);--> statement-breakpoint
ALTER TABLE "rubric_versions" ADD COLUMN "requirements" text;--> statement-breakpoint
ALTER TABLE "rubrics" ADD COLUMN "program_keahlian" varchar(180);--> statement-breakpoint
ALTER TABLE "rubrics" ADD COLUMN "partner_name" varchar(180);--> statement-breakpoint
ALTER TABLE "rubrics" ADD COLUMN "requirements" text;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "portfolio_included" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "portfolio_shares" ADD CONSTRAINT "portfolio_shares_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;