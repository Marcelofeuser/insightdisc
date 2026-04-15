CREATE TABLE "product_access" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "product_key" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "daily_message_limit" INTEGER,
    "daily_messages_used" INTEGER NOT NULL DEFAULT 0,
    "usage_date" TIMESTAMP(3),
    "trial_ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_access_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_access_user_id_product_key_key" ON "product_access"("user_id", "product_key");
CREATE INDEX "product_access_product_key_status_idx" ON "product_access"("product_key", "status");

ALTER TABLE "product_access"
ADD CONSTRAINT "product_access_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
