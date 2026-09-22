-- CreateEnum
CREATE TYPE "SectionRole" AS ENUM ('viewer', 'editor');

-- AlterEnum
ALTER TYPE "ActivityEntity" ADD VALUE 'section_member';

-- CreateTable
CREATE TABLE "section_members" (
    "id" UUID NOT NULL,
    "sectionId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "SectionRole" NOT NULL DEFAULT 'viewer',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "section_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "section_members_userId_idx" ON "section_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "section_members_sectionId_userId_key" ON "section_members"("sectionId", "userId");

-- AddForeignKey
ALTER TABLE "section_members" ADD CONSTRAINT "section_members_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "section_members" ADD CONSTRAINT "section_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

