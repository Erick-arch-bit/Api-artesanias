ALTER TABLE "sales"
  ADD COLUMN "sale_status" varchar(20) DEFAULT 'active' NOT NULL;
--> statement-breakpoint
CREATE INDEX "sales_status_idx" ON "sales" ("sale_status");