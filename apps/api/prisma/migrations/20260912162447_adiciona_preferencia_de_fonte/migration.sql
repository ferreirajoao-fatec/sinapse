-- CreateEnum
CREATE TYPE "FontFamily" AS ENUM ('inter', 'sistema', 'roboto', 'lexend');

-- AlterTable
ALTER TABLE "user_preferences" ADD COLUMN     "fontFamily" "FontFamily" NOT NULL DEFAULT 'inter';
