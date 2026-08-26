-- AlterTable
ALTER TABLE "servers" ADD COLUMN     "mapListChangeMessage" TEXT,
ADD COLUMN     "matchSettingsLoadedMessage" TEXT,
ADD COLUMN     "scriptNameChangeMessage" TEXT,
ADD COLUMN     "scriptSettingsSavedMessage" TEXT;
