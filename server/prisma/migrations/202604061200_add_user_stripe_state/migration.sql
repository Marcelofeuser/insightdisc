-- AlterTable
ALTER TABLE "users"
ADD COLUMN "subscription_status" "SubscriptionStatus",
ADD COLUMN "stripe_customer_id" TEXT,
ADD COLUMN "stripe_subscription_id" TEXT,
ADD COLUMN "white_label_enabled" BOOLEAN NOT NULL DEFAULT false;

