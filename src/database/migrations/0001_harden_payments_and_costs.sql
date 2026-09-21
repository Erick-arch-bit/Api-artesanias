ALTER TABLE "purchase_details"
  ADD COLUMN "cost_remaining_cents" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "payments_idempotency_key_unique"
  ON "payments" ("idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;
