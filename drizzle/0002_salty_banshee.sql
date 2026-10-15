CREATE TABLE "assessor_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"employee_id" varchar(80) NOT NULL,
	"institution" varchar(180) NOT NULL,
	"program_keahlian" varchar(180) NOT NULL,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" varchar(180),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessor_applications_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "assessor_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"employee_id" varchar(80) NOT NULL,
	"institution" varchar(180) NOT NULL,
	"program_keahlian" varchar(180) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessor_profiles_employee_id_unique" UNIQUE("employee_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "registration_intent" varchar(20) DEFAULT 'STUDENT' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "access_status" varchar(20) DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE "assessor_applications" ADD CONSTRAINT "assessor_applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessor_profiles" ADD CONSTRAINT "assessor_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;