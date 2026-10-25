CREATE TYPE "member_role" AS ENUM('owner', 'manager', 'staff', 'accountant');--> statement-breakpoint
CREATE TYPE "member_status" AS ENUM('invited', 'active', 'removed');--> statement-breakpoint
CREATE TYPE "number_series" AS ENUM('PI', 'INV');--> statement-breakpoint
CREATE TYPE "cover_kind" AS ENUM('warranty', 'guarantee');--> statement-breakpoint
CREATE TYPE "booking_status" AS ENUM('to_confirm', 'agreed', 'in_progress', 'completed', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TYPE "invoice_kind" AS ENUM('reply', 'advance', 'balance', 'bill');--> statement-breakpoint
CREATE TYPE "job_status" AS ENUM('open', 'in_progress', 'done', 'invoiced');--> statement-breakpoint
CREATE TYPE "lead_priority" AS ENUM('normal', 'high');--> statement-breakpoint
CREATE TYPE "lead_status" AS ENUM('new', 'contacted', 'replied', 'snoozed', 'rejected', 'paid');--> statement-breakpoint
CREATE TYPE "lead_type" AS ENUM('quoted', 'booked');--> statement-breakpoint
CREATE TYPE "payment_method" AS ENUM('upi', 'bank', 'cash', 'card');--> statement-breakpoint
CREATE TYPE "payment_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "message_channel" AS ENUM('email', 'sms', 'whatsapp');--> statement-breakpoint
CREATE TYPE "message_status" AS ENUM('sent', 'copied');--> statement-breakpoint
CREATE TABLE "activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workspace_id" uuid DEFAULT app_workspace_id() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"by_member_id" uuid,
	"action" text NOT NULL,
	"record_type" text,
	"record_id" uuid,
	"text" text NOT NULL,
	"diff" jsonb
);
--> statement-breakpoint
ALTER TABLE "activity_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "device" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workspace_id" uuid DEFAULT app_workspace_id() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"member_id" uuid NOT NULL,
	"session_id" text,
	"name" text NOT NULL,
	"platform" text,
	"last_seen_at" timestamp with time zone,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "device" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workspace_id" uuid DEFAULT app_workspace_id() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"role" "member_role" NOT NULL,
	"status" "member_status" DEFAULT 'invited'::"member_status" NOT NULL,
	"removed_at" timestamp with time zone,
	"seen_at" timestamp with time zone,
	"mute" jsonb DEFAULT '{}' NOT NULL,
	CONSTRAINT "member_workspace_id_id_unique" UNIQUE("workspace_id","id")
);
--> statement-breakpoint
ALTER TABLE "member" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "numbering_counter" (
	"workspace_id" uuid DEFAULT app_workspace_id(),
	"series" "number_series",
	"fy" text,
	"next" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "numbering_counter_pkey" PRIMARY KEY("workspace_id","series","fy"),
	CONSTRAINT "numbering_counter_fy_check" CHECK (fy ~ '^[0-9]{4}$'),
	CONSTRAINT "numbering_counter_next_check" CHECK (next >= 1)
);
--> statement-breakpoint
ALTER TABLE "numbering_counter" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "workspace" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"legal_name" text,
	"slug" text NOT NULL UNIQUE,
	"vertical" text,
	"address" text,
	"city" text,
	"pin" text,
	"state" text,
	"state_code" text,
	"phone" text,
	"email" text,
	"gstin" text,
	"upi" text,
	"bank" jsonb,
	"brand" jsonb DEFAULT '{}' NOT NULL,
	"numbering" jsonb DEFAULT '{"PI":{"prefix":"PI"},"INV":{"prefix":"INV"}}' NOT NULL,
	"reply_valid_days" integer,
	"bill_due_days" integer,
	"manager_approvals_enabled" boolean DEFAULT false NOT NULL,
	"manager_limit_paise" bigint,
	"modules" jsonb DEFAULT '{}' NOT NULL,
	"opening_hours" jsonb DEFAULT '{}' NOT NULL,
	"terms" text,
	"setup_dismissed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_manager_limit_paise_check" CHECK (manager_limit_paise is null or manager_limit_paise > 0)
);
--> statement-breakpoint
ALTER TABLE "workspace" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "catalog_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workspace_id" uuid DEFAULT app_workspace_id() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"unit" text,
	"price_paise" bigint NOT NULL,
	"gst_rate" numeric(5,2),
	"hsn" text,
	"description" text,
	"show_price" boolean DEFAULT true NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"photos" jsonb DEFAULT '[]' NOT NULL,
	"moq" integer,
	"tracked" boolean DEFAULT false NOT NULL,
	"model" text,
	"model_no" text,
	"cover" "cover_kind",
	"cover_months" integer,
	"track_batch" boolean DEFAULT false NOT NULL,
	CONSTRAINT "catalog_item_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "catalog_item_price_paise_check" CHECK (price_paise >= 0),
	CONSTRAINT "catalog_item_gst_rate_check" CHECK (gst_rate between 0 and 100),
	CONSTRAINT "catalog_item_moq_check" CHECK (moq > 0),
	CONSTRAINT "catalog_item_cover_months_check" CHECK (cover_months > 0)
);
--> statement-breakpoint
ALTER TABLE "catalog_item" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "package" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workspace_id" uuid DEFAULT app_workspace_id() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"tier" text,
	"items" jsonb DEFAULT '[]' NOT NULL,
	"price_paise" bigint NOT NULL,
	"billing" text,
	"bookable" boolean DEFAULT false NOT NULL,
	"duration_min" integer,
	"advance_pct" numeric(5,2),
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "package_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "package_price_paise_check" CHECK (price_paise >= 0),
	CONSTRAINT "package_advance_pct_check" CHECK (advance_pct > 0 and advance_pct <= 100),
	CONSTRAINT "package_duration_min_check" CHECK (duration_min > 0)
);
--> statement-breakpoint
ALTER TABLE "package" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "booking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workspace_id" uuid DEFAULT app_workspace_id() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"customer_id" uuid NOT NULL,
	"lead_id" uuid,
	"package_id" uuid,
	"member_id" uuid,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone,
	"status" "booking_status" DEFAULT 'to_confirm'::"booking_status" NOT NULL,
	"notes" text,
	CONSTRAINT "booking_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "booking_end_check" CHECK (end_at is null or end_at > start_at)
);
--> statement-breakpoint
ALTER TABLE "booking" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "customer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workspace_id" uuid DEFAULT app_workspace_id() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"company" text,
	"gstin" text,
	"state_code" text,
	"address" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"token" text UNIQUE,
	"notes" text,
	CONSTRAINT "customer_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "customer_phone_check" CHECK (phone ~ '^\+[1-9][0-9]{6,14}$')
);
--> statement-breakpoint
ALTER TABLE "customer" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "invoice" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workspace_id" uuid DEFAULT app_workspace_id() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"kind" "invoice_kind" NOT NULL,
	"pi_number" text,
	"inv_number" text,
	"lead_id" uuid,
	"customer_id" uuid NOT NULL,
	"booking_id" uuid,
	"job_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"history" jsonb DEFAULT '[]' NOT NULL,
	"discount_paise" bigint DEFAULT 0 NOT NULL,
	"pay_by" date,
	"due_date" date,
	"shared_at" timestamp with time zone,
	"cancelled" boolean DEFAULT false NOT NULL,
	"cancelled_at" timestamp with time zone,
	"token" text UNIQUE,
	"reminders" jsonb DEFAULT '[]' NOT NULL,
	"cached_total_paise" bigint,
	"cached_status" text,
	CONSTRAINT "invoice_workspace_id_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "invoice_discount_paise_check" CHECK (discount_paise >= 0),
	CONSTRAINT "invoice_version_check" CHECK (version >= 1)
);
--> statement-breakpoint
ALTER TABLE "invoice" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "invoice_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workspace_id" uuid DEFAULT app_workspace_id() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"item_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"qty" numeric(12,3) NOT NULL,
	"unit" text,
	"rate_paise" bigint NOT NULL,
	"full_rate_paise" bigint,
	"gst_rate" numeric(5,2),
	"hsn" text,
	"optional" boolean DEFAULT false NOT NULL,
	"selected" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"tracked" boolean DEFAULT false NOT NULL,
	"model" text,
	"model_no" text,
	"cover" "cover_kind",
	"cover_months" integer,
	"track_batch" boolean DEFAULT false NOT NULL,
	"serial" text,
	"batch" text,
	"card_token" text UNIQUE,
	"invoice_cancelled" boolean DEFAULT false NOT NULL,
	CONSTRAINT "invoice_line_qty_check" CHECK (qty > 0),
	CONSTRAINT "invoice_line_rate_paise_check" CHECK (rate_paise >= 0),
	CONSTRAINT "invoice_line_full_rate_paise_check" CHECK (full_rate_paise is null or full_rate_paise >= 0),
	CONSTRAINT "invoice_line_gst_rate_check" CHECK (gst_rate between 0 and 100)
);
--> statement-breakpoint
ALTER TABLE "invoice_line" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "job" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workspace_id" uuid DEFAULT app_workspace_id() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"booking_id" uuid,
	"lead_id" uuid,
	"customer_id" uuid NOT NULL,
	"assignee_id" uuid,
	"title" text NOT NULL,
	"checklist" jsonb DEFAULT '[]' NOT NULL,
	"status" "job_status" DEFAULT 'open'::"job_status" NOT NULL,
	"start_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"invoice_id" uuid,
	"photos" jsonb DEFAULT '{"before":[],"after":[]}' NOT NULL,
	"materials" jsonb DEFAULT '[]' NOT NULL,
	CONSTRAINT "job_workspace_id_id_unique" UNIQUE("workspace_id","id")
);
--> statement-breakpoint
ALTER TABLE "job" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "lead" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workspace_id" uuid DEFAULT app_workspace_id() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"customer_id" uuid NOT NULL,
	"type" "lead_type" NOT NULL,
	"source" text,
	"brief" text,
	"lines" jsonb DEFAULT '[]' NOT NULL,
	"preferred_date" date,
	"preferred_time" time,
	"package_id" uuid,
	"assignee_id" uuid,
	"status" "lead_status" DEFAULT 'new'::"lead_status" NOT NULL,
	"priority" "lead_priority" DEFAULT 'normal'::"lead_priority" NOT NULL,
	"snoozed_until" timestamp with time zone,
	"reject_reason" text,
	"consent_at" timestamp with time zone,
	"consent_version" text,
	CONSTRAINT "lead_workspace_id_id_unique" UNIQUE("workspace_id","id")
);
--> statement-breakpoint
ALTER TABLE "lead" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "payment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workspace_id" uuid DEFAULT app_workspace_id() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"amount_paise" bigint NOT NULL,
	"method" "payment_method",
	"reference" text,
	"proof" jsonb,
	"uploaded_by_id" uuid,
	"by_customer" boolean DEFAULT false NOT NULL,
	"uploaded_at" timestamp with time zone,
	"status" "payment_status" DEFAULT 'pending'::"payment_status" NOT NULL,
	"decided_by_id" uuid,
	"decided_at" timestamp with time zone,
	"note" text,
	"self_approved" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"approve_token_hash" text UNIQUE,
	"approve_token_expires_at" timestamp with time zone,
	"approve_token_used_at" timestamp with time zone,
	CONSTRAINT "payment_amount_paise_check" CHECK (amount_paise > 0)
);
--> statement-breakpoint
ALTER TABLE "payment" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workspace_id" uuid DEFAULT app_workspace_id() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"channel" "message_channel" NOT NULL,
	"status" "message_status" NOT NULL,
	"from_name" text,
	"reply_to" text,
	"to" text NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"template_number" smallint,
	"record_type" text,
	"record_id" uuid,
	"by_member_id" uuid
);
--> statement-breakpoint
ALTER TABLE "message" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "message_template" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workspace_id" uuid DEFAULT app_workspace_id() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"number" smallint NOT NULL,
	"event" text NOT NULL,
	"name" text NOT NULL,
	"trigger" text,
	"audience" text,
	"subject" text,
	"body" text NOT NULL,
	CONSTRAINT "message_template_workspace_id_number_unique" UNIQUE("workspace_id","number")
);
--> statement-breakpoint
ALTER TABLE "message_template" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX "member_workspace_email_uq" ON "member" ("workspace_id",lower("email")) WHERE status <> 'removed';--> statement-breakpoint
CREATE UNIQUE INDEX "member_workspace_user_uq" ON "member" ("workspace_id","user_id") WHERE status <> 'removed';--> statement-breakpoint
CREATE UNIQUE INDEX "customer_workspace_phone_uq" ON "customer" ("workspace_id","phone");--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_workspace_pi_number_uq" ON "invoice" ("workspace_id","pi_number") WHERE pi_number is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_workspace_inv_number_uq" ON "invoice" ("workspace_id","inv_number") WHERE inv_number is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_line_workspace_serial_uq" ON "invoice_line" ("workspace_id",upper("serial")) WHERE serial is not null and not invoice_cancelled;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_workspace_id_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_member_fk" FOREIGN KEY ("workspace_id","by_member_id") REFERENCES "member"("workspace_id","id");--> statement-breakpoint
ALTER TABLE "device" ADD CONSTRAINT "device_workspace_id_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "device" ADD CONSTRAINT "device_session_id_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "session"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "device" ADD CONSTRAINT "device_member_fk" FOREIGN KEY ("workspace_id","member_id") REFERENCES "member"("workspace_id","id");--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_workspace_id_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "numbering_counter" ADD CONSTRAINT "numbering_counter_workspace_id_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "catalog_item" ADD CONSTRAINT "catalog_item_workspace_id_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "package" ADD CONSTRAINT "package_workspace_id_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_workspace_id_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_customer_fk" FOREIGN KEY ("workspace_id","customer_id") REFERENCES "customer"("workspace_id","id");--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_lead_fk" FOREIGN KEY ("workspace_id","lead_id") REFERENCES "lead"("workspace_id","id");--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_package_fk" FOREIGN KEY ("workspace_id","package_id") REFERENCES "package"("workspace_id","id");--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_member_fk" FOREIGN KEY ("workspace_id","member_id") REFERENCES "member"("workspace_id","id");--> statement-breakpoint
ALTER TABLE "customer" ADD CONSTRAINT "customer_workspace_id_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_workspace_id_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_lead_fk" FOREIGN KEY ("workspace_id","lead_id") REFERENCES "lead"("workspace_id","id");--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_customer_fk" FOREIGN KEY ("workspace_id","customer_id") REFERENCES "customer"("workspace_id","id");--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_booking_fk" FOREIGN KEY ("workspace_id","booking_id") REFERENCES "booking"("workspace_id","id");--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_job_fk" FOREIGN KEY ("workspace_id","job_id") REFERENCES "job"("workspace_id","id");--> statement-breakpoint
ALTER TABLE "invoice_line" ADD CONSTRAINT "invoice_line_workspace_id_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "invoice_line" ADD CONSTRAINT "invoice_line_invoice_fk" FOREIGN KEY ("workspace_id","invoice_id") REFERENCES "invoice"("workspace_id","id");--> statement-breakpoint
ALTER TABLE "job" ADD CONSTRAINT "job_workspace_id_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "job" ADD CONSTRAINT "job_booking_fk" FOREIGN KEY ("workspace_id","booking_id") REFERENCES "booking"("workspace_id","id");--> statement-breakpoint
ALTER TABLE "job" ADD CONSTRAINT "job_lead_fk" FOREIGN KEY ("workspace_id","lead_id") REFERENCES "lead"("workspace_id","id");--> statement-breakpoint
ALTER TABLE "job" ADD CONSTRAINT "job_customer_fk" FOREIGN KEY ("workspace_id","customer_id") REFERENCES "customer"("workspace_id","id");--> statement-breakpoint
ALTER TABLE "job" ADD CONSTRAINT "job_assignee_fk" FOREIGN KEY ("workspace_id","assignee_id") REFERENCES "member"("workspace_id","id");--> statement-breakpoint
ALTER TABLE "job" ADD CONSTRAINT "job_invoice_fk" FOREIGN KEY ("workspace_id","invoice_id") REFERENCES "invoice"("workspace_id","id");--> statement-breakpoint
ALTER TABLE "lead" ADD CONSTRAINT "lead_workspace_id_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "lead" ADD CONSTRAINT "lead_customer_fk" FOREIGN KEY ("workspace_id","customer_id") REFERENCES "customer"("workspace_id","id");--> statement-breakpoint
ALTER TABLE "lead" ADD CONSTRAINT "lead_package_fk" FOREIGN KEY ("workspace_id","package_id") REFERENCES "package"("workspace_id","id");--> statement-breakpoint
ALTER TABLE "lead" ADD CONSTRAINT "lead_assignee_fk" FOREIGN KEY ("workspace_id","assignee_id") REFERENCES "member"("workspace_id","id");--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_workspace_id_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_invoice_fk" FOREIGN KEY ("workspace_id","invoice_id") REFERENCES "invoice"("workspace_id","id");--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_uploaded_by_fk" FOREIGN KEY ("workspace_id","uploaded_by_id") REFERENCES "member"("workspace_id","id");--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_decided_by_fk" FOREIGN KEY ("workspace_id","decided_by_id") REFERENCES "member"("workspace_id","id");--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_workspace_id_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_member_fk" FOREIGN KEY ("workspace_id","by_member_id") REFERENCES "member"("workspace_id","id");--> statement-breakpoint
ALTER TABLE "message_template" ADD CONSTRAINT "message_template_workspace_id_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "activity_log" AS PERMISSIVE FOR ALL TO "biz4kit_app" USING (workspace_id = app_workspace_id()) WITH CHECK (workspace_id = app_workspace_id());--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "device" AS PERMISSIVE FOR ALL TO "biz4kit_app" USING (workspace_id = app_workspace_id()) WITH CHECK (workspace_id = app_workspace_id());--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "member" AS PERMISSIVE FOR ALL TO "biz4kit_app" USING (workspace_id = app_workspace_id()) WITH CHECK (workspace_id = app_workspace_id());--> statement-breakpoint
CREATE POLICY "own_memberships" ON "member" AS PERMISSIVE FOR SELECT TO "biz4kit_app" USING (user_id = app_user_id());--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "numbering_counter" AS PERMISSIVE FOR ALL TO "biz4kit_app" USING (workspace_id = app_workspace_id()) WITH CHECK (workspace_id = app_workspace_id());--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "workspace" AS PERMISSIVE FOR ALL TO "biz4kit_app" USING (id = app_workspace_id()) WITH CHECK (id = app_workspace_id());--> statement-breakpoint
CREATE POLICY "member_workspaces" ON "workspace" AS PERMISSIVE FOR SELECT TO "biz4kit_app" USING (id in (select m.workspace_id from member m where m.user_id = app_user_id() and m.status <> 'removed'));--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "catalog_item" AS PERMISSIVE FOR ALL TO "biz4kit_app" USING (workspace_id = app_workspace_id()) WITH CHECK (workspace_id = app_workspace_id());--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "package" AS PERMISSIVE FOR ALL TO "biz4kit_app" USING (workspace_id = app_workspace_id()) WITH CHECK (workspace_id = app_workspace_id());--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "booking" AS PERMISSIVE FOR ALL TO "biz4kit_app" USING (workspace_id = app_workspace_id()) WITH CHECK (workspace_id = app_workspace_id());--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "customer" AS PERMISSIVE FOR ALL TO "biz4kit_app" USING (workspace_id = app_workspace_id()) WITH CHECK (workspace_id = app_workspace_id());--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "invoice" AS PERMISSIVE FOR ALL TO "biz4kit_app" USING (workspace_id = app_workspace_id()) WITH CHECK (workspace_id = app_workspace_id());--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "invoice_line" AS PERMISSIVE FOR ALL TO "biz4kit_app" USING (workspace_id = app_workspace_id()) WITH CHECK (workspace_id = app_workspace_id());--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "job" AS PERMISSIVE FOR ALL TO "biz4kit_app" USING (workspace_id = app_workspace_id()) WITH CHECK (workspace_id = app_workspace_id());--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "lead" AS PERMISSIVE FOR ALL TO "biz4kit_app" USING (workspace_id = app_workspace_id()) WITH CHECK (workspace_id = app_workspace_id());--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "payment" AS PERMISSIVE FOR ALL TO "biz4kit_app" USING (workspace_id = app_workspace_id()) WITH CHECK (workspace_id = app_workspace_id());--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "message" AS PERMISSIVE FOR ALL TO "biz4kit_app" USING (workspace_id = app_workspace_id()) WITH CHECK (workspace_id = app_workspace_id());--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "message_template" AS PERMISSIVE FOR ALL TO "biz4kit_app" USING (workspace_id = app_workspace_id()) WITH CHECK (workspace_id = app_workspace_id());