ALTER TABLE "users" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "servers" ALTER COLUMN "password" TYPE TEXT, ALTER COLUMN "filemanagerPassword" TYPE TEXT;
