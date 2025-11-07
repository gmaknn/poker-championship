import { Player, Tournament, Season, TournamentPlayer } from '@prisma/client';

export type PlayerWithStats = Player & {
  _count?: {
    tournamentPlayers: number;
    eliminations: number;
  };
};

export type TournamentWithDetails = Tournament & {
  season?: Season | null;
  tournamentPlayers?: (TournamentPlayer & {
    player: Player;
  })[];
  _count?: {
    tournamentPlayers: number;
  };
};

export type LeaderboardEntry = {
  playerId: string;
  player: Player;
  rank: number;
  totalPoints: number;
  tournamentsPlayed: number;
  bestResult: number;
  averagePoints: number;
  variation: number; // Variation de position depuis le dernier tournoi
};

export type TournamentStats = {
  totalTournaments: number;
  totalPlayers: number;
  totalPrizePool: number;
  averagePlayersPerTournament: number;
};

export type PlayerStats = {
  tournamentsPlayed: number;
  victories: number;
  podiums: number;
  totalEliminations: number;
  averageRank: number;
  totalPoints: number;
  bestRank: number;
};
