-- CreateEnum
CREATE TYPE "AnnouncementResponseType" AS ENUM ('NONE', 'ACKNOWLEDGE', 'AUTHORIZATION', 'POLL');

-- CreateEnum
CREATE TYPE "MeetingSlotStatus" AS ENUM ('AVAILABLE', 'BOOKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MeetingMode" AS ENUM ('IN_PERSON', 'VIRTUAL', 'PHONE');

-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN     "pollOptions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "responseDeadline" TIMESTAMP(3),
ADD COLUMN     "responseType" "AnnouncementResponseType" NOT NULL DEFAULT 'NONE';

-- AlterTable
ALTER TABLE "School" ADD COLUMN     "messagingEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "messagingEndTime" TEXT NOT NULL DEFAULT '18:00',
ADD COLUMN     "messagingStartTime" TEXT NOT NULL DEFAULT '07:00',
ADD COLUMN     "whatsappCountryCode" TEXT NOT NULL DEFAULT '51';

-- CreateTable
CREATE TABLE "AnnouncementResponse" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studentId" TEXT,
    "response" TEXT NOT NULL,
    "comment" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "respondedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageText" TEXT,
    "parentLastReadAt" TIMESTAMP(3),
    "staffLastReadAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingSlot" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "mode" "MeetingMode" NOT NULL DEFAULT 'IN_PERSON',
    "location" TEXT,
    "status" "MeetingSlotStatus" NOT NULL DEFAULT 'AVAILABLE',
    "bookedByParentId" TEXT,
    "studentId" TEXT,
    "reason" TEXT,
    "bookedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetingSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnnouncementResponse_schoolId_announcementId_idx" ON "AnnouncementResponse"("schoolId", "announcementId");

-- CreateIndex
CREATE UNIQUE INDEX "AnnouncementResponse_announcementId_userId_studentId_key" ON "AnnouncementResponse"("announcementId", "userId", "studentId");

-- CreateIndex
CREATE INDEX "Conversation_schoolId_parentId_lastMessageAt_idx" ON "Conversation"("schoolId", "parentId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "Conversation_schoolId_staffId_lastMessageAt_idx" ON "Conversation"("schoolId", "staffId", "lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_studentId_parentId_staffId_key" ON "Conversation"("studentId", "parentId", "staffId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "MeetingSlot_schoolId_staffId_startsAt_idx" ON "MeetingSlot"("schoolId", "staffId", "startsAt");

-- CreateIndex
CREATE INDEX "MeetingSlot_schoolId_bookedByParentId_idx" ON "MeetingSlot"("schoolId", "bookedByParentId");

-- AddForeignKey
ALTER TABLE "AnnouncementResponse" ADD CONSTRAINT "AnnouncementResponse_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementResponse" ADD CONSTRAINT "AnnouncementResponse_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementResponse" ADD CONSTRAINT "AnnouncementResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementResponse" ADD CONSTRAINT "AnnouncementResponse_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingSlot" ADD CONSTRAINT "MeetingSlot_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingSlot" ADD CONSTRAINT "MeetingSlot_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingSlot" ADD CONSTRAINT "MeetingSlot_bookedByParentId_fkey" FOREIGN KEY ("bookedByParentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingSlot" ADD CONSTRAINT "MeetingSlot_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

