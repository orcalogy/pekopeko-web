-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RestaurantRecordStatus" AS ENUM ('ACTIVE', 'CLOSED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "RestaurantAliasStatus" AS ENUM ('ACTIVE', 'RETIRED', 'SUSPECT');

-- CreateTable
CREATE TABLE "restaurants" (
    "id" TEXT NOT NULL,
    "restaurantKey" VARCHAR(32) NOT NULL,
    "status" "RestaurantRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "canonicalName" TEXT NOT NULL,
    "normalizedCanonicalName" TEXT,
    "canonicalAddress" TEXT,
    "normalizedCanonicalAddress" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "phone" TEXT,
    "normalizedPhone" TEXT,
    "websiteUrl" TEXT,
    "normalizedWebsiteHost" TEXT,
    "lastObservedSource" TEXT,
    "lastSnapshotJson" JSONB,
    "lastPhotoPayloadJson" JSONB,
    "firstSeenAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "supersededById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "restaurants_no_self_supersession_check" CHECK ("id" IS DISTINCT FROM "supersededById")
);

-- CreateTable
CREATE TABLE "restaurant_aliases" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "status" "RestaurantAliasStatus" NOT NULL DEFAULT 'ACTIVE',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "firstSeenAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "rawName" TEXT,
    "rawAddress" TEXT,
    "rawPhone" TEXT,
    "rawWebsiteUrl" TEXT,
    "rawLat" DOUBLE PRECISION,
    "rawLng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_aliases_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "restaurant_aliases_confidence_range_check" CHECK ("confidence" >= 0 AND "confidence" <= 1)
);

-- CreateIndex
CREATE UNIQUE INDEX "restaurants_restaurantKey_key" ON "restaurants"("restaurantKey");

-- CreateIndex
CREATE INDEX "restaurants_normalizedCanonicalName_idx" ON "restaurants"("normalizedCanonicalName");

-- CreateIndex
CREATE INDEX "restaurants_normalizedCanonicalAddress_idx" ON "restaurants"("normalizedCanonicalAddress");

-- CreateIndex
CREATE INDEX "restaurants_normalizedPhone_idx" ON "restaurants"("normalizedPhone");

-- CreateIndex
CREATE INDEX "restaurants_normalizedWebsiteHost_idx" ON "restaurants"("normalizedWebsiteHost");

-- CreateIndex
CREATE INDEX "restaurants_lat_lng_idx" ON "restaurants"("lat", "lng");

-- CreateIndex
CREATE INDEX "restaurants_supersededById_idx" ON "restaurants"("supersededById");

-- CreateIndex
CREATE INDEX "restaurant_aliases_restaurantId_idx" ON "restaurant_aliases"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_aliases_provider_providerId_key" ON "restaurant_aliases"("provider", "providerId");

-- AddForeignKey
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "restaurants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_aliases" ADD CONSTRAINT "restaurant_aliases_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
