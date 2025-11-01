-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "deletedBy" TEXT[] DEFAULT ARRAY[]::TEXT[];
