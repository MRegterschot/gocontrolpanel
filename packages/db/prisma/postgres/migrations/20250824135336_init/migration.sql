-- AlterTable
ALTER TABLE "records" ALTER COLUMN "login" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "records" ADD CONSTRAINT "records_login_fkey" FOREIGN KEY ("login") REFERENCES "users"("login") ON DELETE SET NULL ON UPDATE CASCADE;
