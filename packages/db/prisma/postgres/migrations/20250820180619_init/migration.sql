/*
  Warnings:

  - A unique constraint covering the columns `[matchId,login,round]` on the table `records` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "records_matchId_login_round_key" ON "records"("matchId", "login", "round");
