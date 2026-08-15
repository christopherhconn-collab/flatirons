-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('lead', 'unassigned', 'scheduled', 'enroute', 'onsite', 'complete');

-- CreateEnum
CREATE TYPE "PipelineStage" AS ENUM ('New', 'Survey set', 'Quoted', 'Booked', 'Complete');

-- CreateTable
CREATE TABLE "crews" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "roster" TEXT NOT NULL,
    "size" INTEGER NOT NULL,

    CONSTRAINT "crews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "customer" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "date" VARCHAR(10) NOT NULL,
    "window" TEXT NOT NULL,
    "movers" INTEGER NOT NULL,
    "crewId" INTEGER,
    "status" "JobStatus" NOT NULL,
    "stage" "PipelineStage" NOT NULL,
    "low" INTEGER NOT NULL,
    "high" INTEGER NOT NULL,
    "counts" JSONB NOT NULL,
    "fromFloor" TEXT NOT NULL,
    "toFloor" TEXT NOT NULL,
    "elevator" BOOLEAN NOT NULL DEFAULT false,
    "packing" BOOLEAN NOT NULL DEFAULT false,
    "clockIn" TIMESTAMP(3),
    "hours" DOUBLE PRECISION,
    "photos" INTEGER NOT NULL DEFAULT 0,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "late" INTEGER,
    "cardLast4" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" SERIAL NOT NULL,
    "jobId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "handling" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_tasks" (
    "id" SERIAL NOT NULL,
    "jobId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL,

    CONSTRAINT "customer_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" SERIAL NOT NULL,
    "jobId" TEXT NOT NULL,
    "who" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "mine" BOOLEAN NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "who" TEXT NOT NULL,
    "place" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "date" VARCHAR(10) NOT NULL,
    "crew" TEXT NOT NULL,
    "jobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_items" (
    "name" TEXT NOT NULL,
    "room" TEXT NOT NULL,
    "volumeUnits" INTEGER NOT NULL,
    "handling" TEXT NOT NULL,
    "surcharge" INTEGER,
    "surchargeLabel" TEXT,
    "position" INTEGER NOT NULL,

    CONSTRAINT "catalog_items_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "quote_drafts" (
    "id" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL DEFAULT '',
    "toAddress" TEXT NOT NULL DEFAULT '',
    "fromFloor" TEXT NOT NULL DEFAULT 'Ground',
    "toFloor" TEXT NOT NULL DEFAULT 'Ground',
    "elevator" BOOLEAN NOT NULL DEFAULT false,
    "size" TEXT NOT NULL DEFAULT '2 bed',
    "date" VARCHAR(10) NOT NULL DEFAULT '',
    "movers" INTEGER NOT NULL DEFAULT 3,
    "packing" BOOLEAN NOT NULL DEFAULT false,
    "counts" JSONB NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "cardNumber" TEXT NOT NULL DEFAULT '',
    "cardExpiry" TEXT NOT NULL DEFAULT '',
    "step" INTEGER NOT NULL DEFAULT 1,
    "room" TEXT NOT NULL DEFAULT 'Living room',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "counters" (
    "name" TEXT NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "counters_pkey" PRIMARY KEY ("name")
);

-- CreateIndex
CREATE UNIQUE INDEX "crews_name_key" ON "crews"("name");

-- CreateIndex
CREATE INDEX "jobs_date_status_idx" ON "jobs"("date", "status");

-- CreateIndex
CREATE INDEX "jobs_stage_idx" ON "jobs"("stage");

-- CreateIndex
CREATE INDEX "inventory_items_jobId_idx" ON "inventory_items"("jobId");

-- CreateIndex
CREATE INDEX "customer_tasks_jobId_idx" ON "customer_tasks"("jobId");

-- CreateIndex
CREATE INDEX "messages_jobId_at_idx" ON "messages"("jobId", "at");

-- CreateIndex
CREATE INDEX "reviews_createdAt_idx" ON "reviews"("createdAt");

-- CreateIndex
CREATE INDEX "catalog_items_room_idx" ON "catalog_items"("room");

-- CreateIndex
CREATE INDEX "quote_drafts_updatedAt_idx" ON "quote_drafts"("updatedAt");

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_crewId_fkey" FOREIGN KEY ("crewId") REFERENCES "crews"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_tasks" ADD CONSTRAINT "customer_tasks_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
