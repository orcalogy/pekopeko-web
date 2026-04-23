-- CreateTable
CREATE TABLE "search_sessions" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "locale" TEXT NOT NULL,
    "pageSize" INTEGER NOT NULL,
    "resolvedJson" JSONB NOT NULL,
    "appliedFiltersJson" JSONB NOT NULL,
    "partialResults" BOOLEAN NOT NULL,
    "providerStatusesJson" JSONB NOT NULL,
    "resultsJson" JSONB NOT NULL,

    CONSTRAINT "search_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "search_sessions_expiresAt_idx" ON "search_sessions"("expiresAt");
