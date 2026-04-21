-- ============================================================
-- Peuplement du tournoi du 17 avril 2026
-- Tournament ID: cmo479s4700dhr5ka308oqy3k
-- Season ID: cmkh7ay6s0000r5k3refxve54
-- 16 joueurs, 10 busts recavés, 16 éliminations finales
-- ============================================================

-- Variables de référence (commentaires)
-- Tournament: cmo479s4700dhr5ka308oqy3k
-- Season: cmkh7ay6s0000r5k3refxve54

-- ============================================================
-- STEP 1: Passer le tournoi en IN_PROGRESS puis FINISHED
-- ============================================================
UPDATE Tournament
SET status = 'FINISHED',
    currentLevel = 10,
    updatedAt = datetime('now')
WHERE id = 'cmo479s4700dhr5ka308oqy3k';

-- ============================================================
-- STEP 2: Marquer tous les joueurs comme payés
-- ============================================================
UPDATE TournamentPlayer
SET hasPaid = 1,
    updatedAt = datetime('now')
WHERE tournamentId = 'cmo479s4700dhr5ka308oqy3k';

-- ============================================================
-- STEP 3: Créer les BustEvents (pendant la période de recave)
-- Tous recavés (recaveApplied = 1)
-- ============================================================

-- Bust 1: Jérémy busté par Vincent
INSERT INTO BustEvent (id, tournamentId, eliminatedId, killerId, level, recaveApplied, createdAt)
VALUES ('bust_01_jeremy_vincent', 'cmo479s4700dhr5ka308oqy3k', 'cmo47bxsa00dtr5kab264oj8w', 'cmo47cy7300e3r5kafbse8v1l', 2, 1, datetime('now'));

-- Bust 2: Karine busté par Greg
INSERT INTO BustEvent (id, tournamentId, eliminatedId, killerId, level, recaveApplied, createdAt)
VALUES ('bust_02_karine_greg', 'cmo479s4700dhr5ka308oqy3k', 'cmo47cy7200dyr5ka23z0135u', 'cmo47c2zf00dvr5kab0mq0ax9', 2, 1, datetime('now'));

-- Bust 3: Karine busté par Georges
INSERT INTO BustEvent (id, tournamentId, eliminatedId, killerId, level, recaveApplied, createdAt)
VALUES ('bust_03_karine_georges', 'cmo479s4700dhr5ka308oqy3k', 'cmo47cy7200dyr5ka23z0135u', 'cmo47cy7200dxr5kaeju1t5yk', 3, 1, datetime('now'));

-- Bust 4: Benji busté par Georges
INSERT INTO BustEvent (id, tournamentId, eliminatedId, killerId, level, recaveApplied, createdAt)
VALUES ('bust_04_benji_georges', 'cmo479s4700dhr5ka308oqy3k', 'cmo47cy7200dwr5kaymy6h5az', 'cmo47cy7200dxr5kaeju1t5yk', 3, 1, datetime('now'));

-- Bust 5: Benji busté par Mika
INSERT INTO BustEvent (id, tournamentId, eliminatedId, killerId, level, recaveApplied, createdAt)
VALUES ('bust_05_benji_mika', 'cmo479s4700dhr5ka308oqy3k', 'cmo47cy7200dwr5kaymy6h5az', 'cmo47cy7200dzr5kau7mo4l9n', 3, 1, datetime('now'));

-- Bust 6: Benji busté par Vincent
INSERT INTO BustEvent (id, tournamentId, eliminatedId, killerId, level, recaveApplied, createdAt)
VALUES ('bust_06_benji_vincent', 'cmo479s4700dhr5ka308oqy3k', 'cmo47cy7200dwr5kaymy6h5az', 'cmo47cy7300e3r5kafbse8v1l', 4, 1, datetime('now'));

-- Bust 7: Rémi busté par NicoJOUQ
INSERT INTO BustEvent (id, tournamentId, eliminatedId, killerId, level, recaveApplied, createdAt)
VALUES ('bust_07_remi_nicojouq', 'cmo479s4700dhr5ka308oqy3k', 'cmo47c2zf00dur5kahxusg702', 'cmo47bkuo00dqr5kaottxqpdb', 4, 1, datetime('now'));

-- Bust 8: NicoBO busté par NicoFO
INSERT INTO BustEvent (id, tournamentId, eliminatedId, killerId, level, recaveApplied, createdAt)
VALUES ('bust_08_nicobo_nicofo', 'cmo479s4700dhr5ka308oqy3k', 'cmo47bkuo00dor5kaqbsvj66l', 'cmo47bkuo00dpr5kabf4ulieb', 4, 1, datetime('now'));

-- Bust 9: Christophe busté par Stephan
INSERT INTO BustEvent (id, tournamentId, eliminatedId, killerId, level, recaveApplied, createdAt)
VALUES ('bust_09_christophe_stephan', 'cmo479s4700dhr5ka308oqy3k', 'cmo47bqz200drr5kaxxjzqon8', 'cmo47cy7200e2r5kapctgjwqi', 4, 1, datetime('now'));

-- Bust 10: Christian busté par Georges
INSERT INTO BustEvent (id, tournamentId, eliminatedId, killerId, level, recaveApplied, createdAt)
VALUES ('bust_10_christian_georges', 'cmo479s4700dhr5ka308oqy3k', 'cmo47bqz300dsr5kahf83elns', 'cmo47cy7200dxr5kaeju1t5yk', 4, 1, datetime('now'));

-- ============================================================
-- STEP 4: Créer les Eliminations finales
-- Du 16ème (premier éliminé) au 2ème
-- Le 1er (NicoJOUQ) n'a pas d'Elimination record
-- ============================================================

-- Rank 16: Jérémy éliminé par Mika
INSERT INTO Elimination (id, tournamentId, eliminatedId, eliminatorId, rank, level, isLeaderKill, isAutoElimination, isAbandonment, createdAt)
VALUES ('elim_16_jeremy', 'cmo479s4700dhr5ka308oqy3k', 'cmkfrg0ur000dr5k3hg9w45wg', 'cmkh8n7iy002nr5k3bwgurs0a', 16, 6, 0, 0, 0, datetime('now'));

-- Rank 15: Mika éliminé par Greg
INSERT INTO Elimination (id, tournamentId, eliminatedId, eliminatorId, rank, level, isLeaderKill, isAutoElimination, isAbandonment, createdAt)
VALUES ('elim_15_mika', 'cmo479s4700dhr5ka308oqy3k', 'cmkh8n7iy002nr5k3bwgurs0a', 'cmkfr7oa9000ar5k3971z2lov', 15, 6, 0, 0, 0, datetime('now'));

-- Rank 14: Romain éliminé par Pascal
INSERT INTO Elimination (id, tournamentId, eliminatedId, eliminatorId, rank, level, isLeaderKill, isAutoElimination, isAbandonment, createdAt)
VALUES ('elim_14_romain', 'cmo479s4700dhr5ka308oqy3k', 'cmkfr6dxe0007r5k3554h80lu', 'cmkfqidwk0001r5k2108iu4ak', 14, 6, 0, 0, 0, datetime('now'));

-- Rank 13: Rémi éliminé par Karine
INSERT INTO Elimination (id, tournamentId, eliminatedId, eliminatorId, rank, level, isLeaderKill, isAutoElimination, isAbandonment, createdAt)
VALUES ('elim_13_remi', 'cmo479s4700dhr5ka308oqy3k', 'cmkfr3w8f0003r5k3exb92wpr', 'cmkfqjb1f0002r5k2bjo9i95d', 13, 7, 0, 0, 0, datetime('now'));

-- Rank 12: Christophe éliminé par Georges
INSERT INTO Elimination (id, tournamentId, eliminatedId, eliminatorId, rank, level, isLeaderKill, isAutoElimination, isAbandonment, createdAt)
VALUES ('elim_12_christophe', 'cmo479s4700dhr5ka308oqy3k', 'cmkfrfryg000cr5k3a2hxz7b4', 'cmkfr36q90002r5k306i4q51j', 12, 7, 0, 0, 0, datetime('now'));

-- Rank 11: NicoBO éliminé par Georges
INSERT INTO Elimination (id, tournamentId, eliminatedId, eliminatorId, rank, level, isLeaderKill, isAutoElimination, isAbandonment, createdAt)
VALUES ('elim_11_nicobo', 'cmo479s4700dhr5ka308oqy3k', 'cmkfr514n0005r5k34org547m', 'cmkfr36q90002r5k306i4q51j', 11, 7, 0, 0, 0, datetime('now'));

-- Rank 10: NicoFO éliminé par Greg
INSERT INTO Elimination (id, tournamentId, eliminatedId, eliminatorId, rank, level, isLeaderKill, isAutoElimination, isAbandonment, createdAt)
VALUES ('elim_10_nicofo', 'cmo479s4700dhr5ka308oqy3k', 'cmkfr4iuw0004r5k3jjq65qzx', 'cmkfr7oa9000ar5k3971z2lov', 10, 8, 0, 0, 0, datetime('now'));

-- Rank 9: Benji éliminé par Vincent
INSERT INTO Elimination (id, tournamentId, eliminatedId, eliminatorId, rank, level, isLeaderKill, isAutoElimination, isAbandonment, createdAt)
VALUES ('elim_09_benji', 'cmo479s4700dhr5ka308oqy3k', 'cmkfr5j7d0006r5k3jyunl98a', 'cmkfr2te50001r5k3l8w2g98h', 9, 8, 0, 0, 0, datetime('now'));

-- Rank 8: Christian éliminé par Greg
INSERT INTO Elimination (id, tournamentId, eliminatedId, eliminatorId, rank, level, isLeaderKill, isAutoElimination, isAbandonment, createdAt)
VALUES ('elim_08_christian', 'cmo479s4700dhr5ka308oqy3k', 'cmkfra30s000br5k3zub8ud6b', 'cmkfr7oa9000ar5k3971z2lov', 8, 8, 0, 0, 0, datetime('now'));

-- Rank 7: Pascal éliminé par Stephan
INSERT INTO Elimination (id, tournamentId, eliminatedId, eliminatorId, rank, level, isLeaderKill, isAutoElimination, isAbandonment, createdAt)
VALUES ('elim_07_pascal', 'cmo479s4700dhr5ka308oqy3k', 'cmkfqidwk0001r5k2108iu4ak', 'cmmhlnah300kyr5k9a4forq3z', 7, 9, 0, 0, 0, datetime('now'));

-- Rank 6: Karine éliminé par NicoJOUQ
INSERT INTO Elimination (id, tournamentId, eliminatedId, eliminatorId, rank, level, isLeaderKill, isAutoElimination, isAbandonment, createdAt)
VALUES ('elim_06_karine', 'cmo479s4700dhr5ka308oqy3k', 'cmkfqjb1f0002r5k2bjo9i95d', 'cmkh8nv2v002or5k3nvj8ec12', 6, 9, 0, 0, 0, datetime('now'));

-- Rank 5: Georges éliminé par Greg
INSERT INTO Elimination (id, tournamentId, eliminatedId, eliminatorId, rank, level, isLeaderKill, isAutoElimination, isAbandonment, createdAt)
VALUES ('elim_05_georges', 'cmo479s4700dhr5ka308oqy3k', 'cmkfr36q90002r5k306i4q51j', 'cmkfr7oa9000ar5k3971z2lov', 5, 9, 0, 0, 0, datetime('now'));

-- Rank 4: Stephan éliminé par NicoJOUQ
INSERT INTO Elimination (id, tournamentId, eliminatedId, eliminatorId, rank, level, isLeaderKill, isAutoElimination, isAbandonment, createdAt)
VALUES ('elim_04_stephan', 'cmo479s4700dhr5ka308oqy3k', 'cmmhlnah300kyr5k9a4forq3z', 'cmkh8nv2v002or5k3nvj8ec12', 4, 10, 0, 0, 0, datetime('now'));

-- Rank 3: Greg éliminé par NicoJOUQ
INSERT INTO Elimination (id, tournamentId, eliminatedId, eliminatorId, rank, level, isLeaderKill, isAutoElimination, isAbandonment, createdAt)
VALUES ('elim_03_greg', 'cmo479s4700dhr5ka308oqy3k', 'cmkfr7oa9000ar5k3971z2lov', 'cmkh8nv2v002or5k3nvj8ec12', 3, 10, 0, 0, 0, datetime('now'));

-- Rank 2: Vincent éliminé par NicoJOUQ
INSERT INTO Elimination (id, tournamentId, eliminatedId, eliminatorId, rank, level, isLeaderKill, isAutoElimination, isAbandonment, createdAt)
VALUES ('elim_02_vincent', 'cmo479s4700dhr5ka308oqy3k', 'cmkfr2te50001r5k3l8w2g98h', 'cmkh8nv2v002or5k3nvj8ec12', 2, 10, 0, 0, 0, datetime('now'));

-- ============================================================
-- STEP 5: Mettre à jour les TournamentPlayer
-- finalRank, rebuysCount, bustEliminations, eliminationsCount, points
-- ============================================================

-- NicoJOUQ - Rank 1, 0 rebuys, 1 bustElim, 4 finalElims
-- RankPts=1500, ElimPts=4*50+1*25=225, Penalty=0, Total=1725
UPDATE TournamentPlayer SET
  finalRank = 1,
  rebuysCount = 0,
  bustEliminations = 1,
  eliminationsCount = 4,
  leaderKills = 0,
  penaltyPoints = 0,
  rankPoints = 1500,
  eliminationPoints = 225,
  bonusPoints = 0,
  totalPoints = 1725,
  prizeAmount = 130,
  updatedAt = datetime('now')
WHERE id = 'cmo47bkuo00dqr5kaottxqpdb';

-- Vincent - Rank 2, 0 rebuys, 2 bustElims, 1 finalElim
-- RankPts=1000, ElimPts=1*50+2*25=100, Penalty=0, Total=1100
UPDATE TournamentPlayer SET
  finalRank = 2,
  rebuysCount = 0,
  bustEliminations = 2,
  eliminationsCount = 1,
  leaderKills = 0,
  penaltyPoints = 0,
  rankPoints = 1000,
  eliminationPoints = 100,
  bonusPoints = 0,
  totalPoints = 1100,
  prizeAmount = 80,
  updatedAt = datetime('now')
WHERE id = 'cmo47cy7300e3r5kafbse8v1l';

-- Greg - Rank 3, 0 rebuys, 1 bustElim, 4 finalElims
-- RankPts=700, ElimPts=4*50+1*25=225, Penalty=0, Total=925
UPDATE TournamentPlayer SET
  finalRank = 3,
  rebuysCount = 0,
  bustEliminations = 1,
  eliminationsCount = 4,
  leaderKills = 0,
  penaltyPoints = 0,
  rankPoints = 700,
  eliminationPoints = 225,
  bonusPoints = 0,
  totalPoints = 925,
  prizeAmount = 30,
  updatedAt = datetime('now')
WHERE id = 'cmo47c2zf00dvr5kab0mq0ax9';

-- Stephan - Rank 4, 0 rebuys, 1 bustElim, 1 finalElim
-- RankPts=500, ElimPts=1*50+1*25=75, Penalty=0, Total=575
UPDATE TournamentPlayer SET
  finalRank = 4,
  rebuysCount = 0,
  bustEliminations = 1,
  eliminationsCount = 1,
  leaderKills = 0,
  penaltyPoints = 0,
  rankPoints = 500,
  eliminationPoints = 75,
  bonusPoints = 0,
  totalPoints = 575,
  prizeAmount = NULL,
  updatedAt = datetime('now')
WHERE id = 'cmo47cy7200e2r5kapctgjwqi';

-- Georges - Rank 5, 0 rebuys, 3 bustElims, 2 finalElims
-- RankPts=400, ElimPts=2*50+3*25=175, Penalty=0, Total=575
UPDATE TournamentPlayer SET
  finalRank = 5,
  rebuysCount = 0,
  bustEliminations = 3,
  eliminationsCount = 2,
  leaderKills = 0,
  penaltyPoints = 0,
  rankPoints = 400,
  eliminationPoints = 175,
  bonusPoints = 0,
  totalPoints = 575,
  prizeAmount = NULL,
  updatedAt = datetime('now')
WHERE id = 'cmo47cy7200dxr5kaeju1t5yk';

-- Karine - Rank 6, 2 rebuys, 0 bustElims, 1 finalElim
-- RankPts=300, ElimPts=1*50=50, Penalty=-50, Total=300
UPDATE TournamentPlayer SET
  finalRank = 6,
  rebuysCount = 2,
  bustEliminations = 0,
  eliminationsCount = 1,
  leaderKills = 0,
  penaltyPoints = -50,
  rankPoints = 300,
  eliminationPoints = 50,
  bonusPoints = 0,
  totalPoints = 300,
  prizeAmount = NULL,
  updatedAt = datetime('now')
WHERE id = 'cmo47cy7200dyr5ka23z0135u';

-- Pascal - Rank 7, 0 rebuys, 0 bustElims, 1 finalElim
-- RankPts=250, ElimPts=1*50=50, Penalty=0, Total=300
UPDATE TournamentPlayer SET
  finalRank = 7,
  rebuysCount = 0,
  bustEliminations = 0,
  eliminationsCount = 1,
  leaderKills = 0,
  penaltyPoints = 0,
  rankPoints = 250,
  eliminationPoints = 50,
  bonusPoints = 0,
  totalPoints = 300,
  prizeAmount = NULL,
  updatedAt = datetime('now')
WHERE id = 'cmo47cy7200e0r5kacuft8lae';

-- Christian - Rank 8, 1 rebuy, 0 bustElims, 0 finalElims
-- RankPts=200, ElimPts=0, Penalty=0 (1 rebuy <= freeRebuysCount=1), Total=200
UPDATE TournamentPlayer SET
  finalRank = 8,
  rebuysCount = 1,
  bustEliminations = 0,
  eliminationsCount = 0,
  leaderKills = 0,
  penaltyPoints = 0,
  rankPoints = 200,
  eliminationPoints = 0,
  bonusPoints = 0,
  totalPoints = 200,
  prizeAmount = NULL,
  updatedAt = datetime('now')
WHERE id = 'cmo47bqz300dsr5kahf83elns';

-- Benji - Rank 9, 3 rebuys, 0 bustElims, 0 finalElims
-- RankPts=180, ElimPts=0, Penalty=-100 (payantes=max(0,3-1)=2, 2*-50=-100), Total=80
UPDATE TournamentPlayer SET
  finalRank = 9,
  rebuysCount = 3,
  bustEliminations = 0,
  eliminationsCount = 0,
  leaderKills = 0,
  penaltyPoints = -100,
  rankPoints = 180,
  eliminationPoints = 0,
  bonusPoints = 0,
  totalPoints = 80,
  prizeAmount = NULL,
  updatedAt = datetime('now')
WHERE id = 'cmo47cy7200dwr5kaymy6h5az';

-- NicoFO - Rank 10, 0 rebuys, 1 bustElim, 0 finalElims
-- RankPts=160, ElimPts=0*50+1*25=25, Penalty=0, Total=185
UPDATE TournamentPlayer SET
  finalRank = 10,
  rebuysCount = 0,
  bustEliminations = 1,
  eliminationsCount = 0,
  leaderKills = 0,
  penaltyPoints = 0,
  rankPoints = 160,
  eliminationPoints = 25,
  bonusPoints = 0,
  totalPoints = 185,
  prizeAmount = NULL,
  updatedAt = datetime('now')
WHERE id = 'cmo47bkuo00dpr5kabf4ulieb';

-- NicoBO - Rank 11, 1 rebuy, 0 bustElims, 0 finalElims
-- RankPts=140, ElimPts=0, Penalty=0 (1 rebuy <= freeRebuysCount=1), Total=140
UPDATE TournamentPlayer SET
  finalRank = 11,
  rebuysCount = 1,
  bustEliminations = 0,
  eliminationsCount = 0,
  leaderKills = 0,
  penaltyPoints = 0,
  rankPoints = 140,
  eliminationPoints = 0,
  bonusPoints = 0,
  totalPoints = 140,
  prizeAmount = NULL,
  updatedAt = datetime('now')
WHERE id = 'cmo47bkuo00dor5kaqbsvj66l';

-- Christophe - Rank 12, 1 rebuy, 0 bustElims, 0 finalElims
-- RankPts=120, ElimPts=0, Penalty=0, Total=120
UPDATE TournamentPlayer SET
  finalRank = 12,
  rebuysCount = 1,
  bustEliminations = 0,
  eliminationsCount = 0,
  leaderKills = 0,
  penaltyPoints = 0,
  rankPoints = 120,
  eliminationPoints = 0,
  bonusPoints = 0,
  totalPoints = 120,
  prizeAmount = NULL,
  updatedAt = datetime('now')
WHERE id = 'cmo47bqz200drr5kaxxjzqon8';

-- Rémi - Rank 13, 1 rebuy, 0 bustElims, 0 finalElims
-- RankPts=100, ElimPts=0, Penalty=0, Total=100
UPDATE TournamentPlayer SET
  finalRank = 13,
  rebuysCount = 1,
  bustEliminations = 0,
  eliminationsCount = 0,
  leaderKills = 0,
  penaltyPoints = 0,
  rankPoints = 100,
  eliminationPoints = 0,
  bonusPoints = 0,
  totalPoints = 100,
  prizeAmount = NULL,
  updatedAt = datetime('now')
WHERE id = 'cmo47c2zf00dur5kahxusg702';

-- Romain - Rank 14, 0 rebuys, 0 bustElims, 0 finalElims
-- RankPts=90, ElimPts=0, Penalty=0, Total=90
UPDATE TournamentPlayer SET
  finalRank = 14,
  rebuysCount = 0,
  bustEliminations = 0,
  eliminationsCount = 0,
  leaderKills = 0,
  penaltyPoints = 0,
  rankPoints = 90,
  eliminationPoints = 0,
  bonusPoints = 0,
  totalPoints = 90,
  prizeAmount = NULL,
  updatedAt = datetime('now')
WHERE id = 'cmo47cy7200e1r5kaumof57dz';

-- Mika - Rank 15, 0 rebuys, 1 bustElim, 1 finalElim
-- RankPts=80, ElimPts=1*50+1*25=75, Penalty=0, Total=155
UPDATE TournamentPlayer SET
  finalRank = 15,
  rebuysCount = 0,
  bustEliminations = 1,
  eliminationsCount = 1,
  leaderKills = 0,
  penaltyPoints = 0,
  rankPoints = 80,
  eliminationPoints = 75,
  bonusPoints = 0,
  totalPoints = 155,
  prizeAmount = NULL,
  updatedAt = datetime('now')
WHERE id = 'cmo47cy7200dzr5kau7mo4l9n';

-- Jérémy - Rank 16, 1 rebuy, 0 bustElims, 0 finalElims
-- RankPts=70, ElimPts=0, Penalty=0 (1 rebuy <= freeRebuysCount=1), Total=70
UPDATE TournamentPlayer SET
  finalRank = 16,
  rebuysCount = 1,
  bustEliminations = 0,
  eliminationsCount = 0,
  leaderKills = 0,
  penaltyPoints = 0,
  rankPoints = 70,
  eliminationPoints = 0,
  bonusPoints = 0,
  totalPoints = 70,
  prizeAmount = NULL,
  updatedAt = datetime('now')
WHERE id = 'cmo47bxsa00dtr5kab264oj8w';

-- ============================================================
-- STEP 6: Prize pool configuration
-- 1er: 130€, 2nd: 80€, 3ème: 30€, ajustement: 20€
-- Total buy-ins: 16*10 = 160 + 10 rebuys*10 = 100 = 260€
-- Ajustement: 20€ => on met l'ajustement dans le champ dédié
-- ============================================================
UPDATE Tournament SET
  prizePayoutCount = 3,
  prizePayoutPercents = '[130, 80, 30]',
  prizePoolAdjustment = 20,
  prizePoolAdjustmentReason = 'Ajustement tournoi du 17 avril',
  prizePayoutUpdatedAt = datetime('now'),
  updatedAt = datetime('now')
WHERE id = 'cmo479s4700dhr5ka308oqy3k';

-- ============================================================
-- STEP 7: Table assignments (distribution fictive, 2 tables de 8)
-- ============================================================

-- Table 1
INSERT INTO TableAssignment (id, tournamentId, playerId, tableNumber, seatNumber, isActive, isTableDirector) VALUES
('ta_01', 'cmo479s4700dhr5ka308oqy3k', 'cmkh8nv2v002or5k3nvj8ec12', 1, 1, 0, 0),
('ta_02', 'cmo479s4700dhr5ka308oqy3k', 'cmkfr2te50001r5k3l8w2g98h', 1, 2, 0, 0),
('ta_03', 'cmo479s4700dhr5ka308oqy3k', 'cmkfr7oa9000ar5k3971z2lov', 1, 3, 0, 0),
('ta_04', 'cmo479s4700dhr5ka308oqy3k', 'cmkfr36q90002r5k306i4q51j', 1, 4, 0, 0),
('ta_05', 'cmo479s4700dhr5ka308oqy3k', 'cmkfqjb1f0002r5k2bjo9i95d', 1, 5, 0, 0),
('ta_06', 'cmo479s4700dhr5ka308oqy3k', 'cmkfqidwk0001r5k2108iu4ak', 1, 6, 0, 0),
('ta_07', 'cmo479s4700dhr5ka308oqy3k', 'cmkfrg0ur000dr5k3hg9w45wg', 1, 7, 0, 0),
('ta_08', 'cmo479s4700dhr5ka308oqy3k', 'cmkh8n7iy002nr5k3bwgurs0a', 1, 8, 0, 0);

-- Table 2
INSERT INTO TableAssignment (id, tournamentId, playerId, tableNumber, seatNumber, isActive, isTableDirector) VALUES
('ta_09', 'cmo479s4700dhr5ka308oqy3k', 'cmmhlnah300kyr5k9a4forq3z', 2, 1, 0, 0),
('ta_10', 'cmo479s4700dhr5ka308oqy3k', 'cmkfr5j7d0006r5k3jyunl98a', 2, 2, 0, 0),
('ta_11', 'cmo479s4700dhr5ka308oqy3k', 'cmkfra30s000br5k3zub8ud6b', 2, 3, 0, 0),
('ta_12', 'cmo479s4700dhr5ka308oqy3k', 'cmkfrfryg000cr5k3a2hxz7b4', 2, 4, 0, 0),
('ta_13', 'cmo479s4700dhr5ka308oqy3k', 'cmkfr3w8f0003r5k3exb92wpr', 2, 5, 0, 0),
('ta_14', 'cmo479s4700dhr5ka308oqy3k', 'cmkfr4iuw0004r5k3jjq65qzx', 2, 6, 0, 0),
('ta_15', 'cmo479s4700dhr5ka308oqy3k', 'cmkfr514n0005r5k34org547m', 2, 7, 0, 0),
('ta_16', 'cmo479s4700dhr5ka308oqy3k', 'cmkfr6dxe0007r5k3554h80lu', 2, 8, 0, 0);
