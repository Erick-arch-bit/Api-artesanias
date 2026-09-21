ALTER TABLE "users"
  ADD COLUMN "token_version" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "products"
  ADD COLUMN "cost_price_cents" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "payments"
  ADD COLUMN "payment_status" varchar(20) DEFAULT 'active' NOT NULL;
--> statement-breakpoint
ALTER TABLE "payments"
  ADD COLUMN "corrected_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "payments"
  ADD COLUMN "correction_note" text;