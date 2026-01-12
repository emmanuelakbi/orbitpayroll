-- DropIndex
DROP INDEX "contractors_org_id_wallet_address_key";

-- CreateIndex
-- Partial unique index: only active contractors must have unique wallet addresses within an org
CREATE UNIQUE INDEX "contractors_org_id_wallet_address_active_key" 
ON "contractors"("org_id", "wallet_address") 
WHERE "active" = true;
