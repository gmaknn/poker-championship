-- CreateIndex
CREATE UNIQUE INDEX "TournamentPlayer_tournamentId_finalRank_key" ON "TournamentPlayer"("tournamentId", "finalRank");
