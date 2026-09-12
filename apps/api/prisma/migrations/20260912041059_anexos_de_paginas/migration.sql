-- CreateTable
CREATE TABLE "page_attachments" (
    "id" UUID NOT NULL,
    "pageId" UUID NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(120) NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "storageKey" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "page_attachments_pageId_idx" ON "page_attachments"("pageId");

-- AddForeignKey
ALTER TABLE "page_attachments" ADD CONSTRAINT "page_attachments_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
