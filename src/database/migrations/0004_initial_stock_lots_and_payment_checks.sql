ALTER TABLE "purchase_details"
  ALTER COLUMN "purchase_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "payments"
  ADD CONSTRAINT "payments_amount_by_status_check"
  CHECK (("payment_status" = 'compensation' AND "amount_cents" < 0) OR ("payment_status" <> 'compensation' AND "amount_cents" > 0));