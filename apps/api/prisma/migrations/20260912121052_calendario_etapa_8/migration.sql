-- CreateEnum
CREATE TYPE "RecurrenceFrequency" AS ENUM ('none', 'daily', 'weekly', 'monthly');

-- AlterEnum
ALTER TYPE "ActivityEntity" ADD VALUE 'calendar_event';

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "location" VARCHAR(200),
    "link" VARCHAR(500),
    "color" "EntityColor" NOT NULL DEFAULT 'indigo',
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "recurrenceFreq" "RecurrenceFrequency" NOT NULL DEFAULT 'none',
    "recurrenceInterval" INTEGER NOT NULL DEFAULT 1,
    "recurrenceUntil" TIMESTAMP(3),
    "reminderMinutesBefore" INTEGER,
    "archivedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_event_reminder_logs" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "occurrenceStartAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_event_reminder_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "calendar_events_userId_deletedAt_startAt_idx" ON "calendar_events"("userId", "deletedAt", "startAt");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_event_reminder_logs_eventId_occurrenceStartAt_key" ON "calendar_event_reminder_logs"("eventId", "occurrenceStartAt");

-- CreateIndex
CREATE INDEX "tasks_calendarEventId_idx" ON "tasks"("calendarEventId");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_calendarEventId_fkey" FOREIGN KEY ("calendarEventId") REFERENCES "calendar_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
