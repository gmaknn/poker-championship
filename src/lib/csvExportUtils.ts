/**
 * CSV and Excel Export Utilities
 * For exporting tournament data, statistics, and leaderboards
 */

/**
 * Convert array of objects to CSV string
 */
export const convertToCSV = (data: any[], headers?: string[]): string => {
  if (!data || data.length === 0) {
    return '';
  }

  // Get headers from first object if not provided
  const csvHeaders = headers || Object.keys(data[0]);

  // Create header row
  const headerRow = csvHeaders.join(',');

  // Create data rows
  const dataRows = data.map(row => {
    return csvHeaders.map(header => {
      const value = row[header];

      // Handle null/undefined
      if (value === null || value === undefined) {
        return '';
      }

      // Convert to string
      let stringValue = String(value);

      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        stringValue = `"${stringValue.replace(/"/g, '""')}"`;
      }

      return stringValue;
    }).join(',');
  });

  return [headerRow, ...dataRows].join('\n');
};

/**
 * Download CSV file
 */
export const downloadCSV = (csvContent: string, filename: string): void => {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

/**
 * Statistics data for CSV export
 */
export interface StatisticsCSVData {
  overview: {
    totalTournaments: number;
    finishedTournaments: number;
    totalPlayers: number;
    activePlayers: number;
    avgPlayersPerTournament: number;
    avgDurationHours: number;
  };
  seasonStats: Array<{
    id: string;
    name: string;
    totalTournaments: number;
    finishedTournaments: number;
    totalPlayers: number;
    avgPlayersPerTournament: number;
  }>;
  topPlayers: Array<{
    id: string;
    name: string;
    nickname: string;
    tournamentsPlayed: number;
  }>;
}

/**
 * Export statistics as CSV
 */
export const exportStatisticsCSV = (data: StatisticsCSVData): void => {
  // Create overview section
  const overviewData = [
    { Métrique: 'Total Tournois', Valeur: data.overview.totalTournaments },
    { Métrique: 'Tournois Terminés', Valeur: data.overview.finishedTournaments },
    { Métrique: 'Total Joueurs', Valeur: data.overview.totalPlayers },
    { Métrique: 'Joueurs Actifs', Valeur: data.overview.activePlayers },
    { Métrique: 'Moyenne Joueurs/Tournoi', Valeur: data.overview.avgPlayersPerTournament },
    { Métrique: 'Durée Moyenne (heures)', Valeur: data.overview.avgDurationHours },
  ];

  // Create season stats section
  const seasonData = data.seasonStats.map(season => ({
    Saison: season.name,
    'Total Tournois': season.totalTournaments,
    'Tournois Terminés': season.finishedTournaments,
    'Total Inscriptions': season.totalPlayers,
    'Moyenne Joueurs': season.avgPlayersPerTournament,
  }));

  // Create top players section
  const playersData = data.topPlayers.map((player, index) => ({
    Rang: index + 1,
    Joueur: player.name,
    Pseudo: player.nickname,
    'Tournois Joués': player.tournamentsPlayed,
  }));

  // Combine all sections
  let csvContent = 'STATISTIQUES GLOBALES\n';
  csvContent += convertToCSV(overviewData);
  csvContent += '\n\n';

  csvContent += 'STATISTIQUES PAR SAISON\n';
  csvContent += convertToCSV(seasonData);
  csvContent += '\n\n';

  csvContent += 'JOUEURS LES PLUS ACTIFS\n';
  csvContent += convertToCSV(playersData);

  const timestamp = new Date().toISOString().split('T')[0];
  downloadCSV(csvContent, `statistiques_${timestamp}`);
};

/**
 * Leaderboard data for CSV export
 */
export interface LeaderboardCSVData {
  seasonName: string;
  year: number;
  players: Array<{
    rank: number;
    playerId: string;
    player: {
      firstName: string;
      lastName: string;
      nickname: string;
    };
    totalPoints: number;
    tournamentsCount: number;
    averagePoints: number;
    victories: number;
    podiums: number;
  }>;
}

/**
 * Export leaderboard as CSV
 */
export const exportLeaderboardCSV = (data: LeaderboardCSVData): void => {
  const csvData = data.players.map(entry => ({
    Rang: entry.rank,
    Prénom: entry.player.firstName,
    Nom: entry.player.lastName,
    Pseudo: entry.player.nickname,
    'Points Total': entry.totalPoints,
    'Moyenne Points': entry.averagePoints,
    'Tournois Joués': entry.tournamentsCount,
    Victoires: entry.victories,
    Podiums: entry.podiums,
  }));

  const csvContent = convertToCSV(csvData);
  const filename = `classement_${data.seasonName.toLowerCase().replace(/\s+/g, '_')}_${data.year}`;

  downloadCSV(csvContent, filename);
};

/**
 * Tournament results data for CSV export
 */
export interface TournamentResultsCSVData {
  tournamentName: string;
  date: string;
  season?: {
    name: string;
    year: number;
  };
  players: Array<{
    finalRank: number | null;
    player: {
      nickname: string;
      firstName: string;
      lastName: string;
    };
    totalPoints: number;
    positionPoints: number;
    eliminationPoints: number;
    bonusPoints: number;
    penaltyPoints: number;
    eliminations: number;
    rebuys: number;
    prizeAmount?: number;
  }>;
  buyIn?: number;
  prizePool?: number;
}

/**
 * Export tournament results as CSV
 */
export const exportTournamentResultsCSV = (data: TournamentResultsCSVData): void => {
  const csvData = data.players
    .filter(p => p.finalRank !== null)
    .sort((a, b) => (a.finalRank || 0) - (b.finalRank || 0))
    .map(entry => ({
      Classement: entry.finalRank,
      Prénom: entry.player.firstName,
      Nom: entry.player.lastName,
      Pseudo: entry.player.nickname,
      'Points Total': entry.totalPoints,
      'Points Position': entry.positionPoints,
      'Points Élimination': entry.eliminationPoints,
      'Points Bonus': entry.bonusPoints,
      'Points Pénalité': entry.penaltyPoints,
      Éliminations: entry.eliminations,
      Rebuys: entry.rebuys,
      ...(entry.prizeAmount ? { 'Prize (€)': entry.prizeAmount } : {}),
    }));

  const cleanName = data.tournamentName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const dateStr = new Date(data.date).toISOString().split('T')[0];
  const filename = `resultats_${cleanName}_${dateStr}`;

  downloadCSV(convertToCSV(csvData), filename);
};

/**
 * Monthly tournament data for CSV export
 */
export interface MonthlyDataCSVExport {
  monthlyData: Array<{
    date: string;
    month: string;
    playerCount: number;
    tournamentName: string;
  }>;
}

/**
 * Export monthly tournament data as CSV
 */
export const exportMonthlyDataCSV = (data: MonthlyDataCSVExport): void => {
  const csvData = data.monthlyData.map(item => ({
    Date: new Date(item.date).toLocaleDateString('fr-FR'),
    Mois: item.month,
    Tournoi: item.tournamentName,
    'Nombre Joueurs': item.playerCount,
  }));

  const timestamp = new Date().toISOString().split('T')[0];
  downloadCSV(convertToCSV(csvData), `evolution_mensuelle_${timestamp}`);
};

/**
 * Player statistics data for CSV export
 */
export interface PlayerStatsCSVData {
  player: {
    firstName: string;
    lastName: string;
    nickname: string;
  };
  tournaments: Array<{
    tournamentName: string;
    date: string;
    finalRank: number | null;
    totalPoints: number;
    eliminations: number;
    rebuys: number;
    prizeAmount: number;
  }>;
  totalStats: {
    tournamentsPlayed: number;
    totalPoints: number;
    averagePoints: number;
    averageRank: number;
    victories: number;
    podiums: number;
    totalEliminations: number;
    totalRebuys: number;
    totalPrizes: number;
  };
}

/**
 * Export player statistics as CSV
 */
export const exportPlayerStatsCSV = (data: PlayerStatsCSVData): void => {
  // Summary section
  const summaryData = [
    { Métrique: 'Joueur', Valeur: `${data.player.firstName} ${data.player.lastName} (@${data.player.nickname})` },
    { Métrique: 'Tournois Joués', Valeur: data.totalStats.tournamentsPlayed },
    { Métrique: 'Points Total', Valeur: data.totalStats.totalPoints },
    { Métrique: 'Moyenne Points', Valeur: data.totalStats.averagePoints },
    { Métrique: 'Classement Moyen', Valeur: data.totalStats.averageRank.toFixed(1) },
    { Métrique: 'Victoires', Valeur: data.totalStats.victories },
    { Métrique: 'Podiums', Valeur: data.totalStats.podiums },
    { Métrique: 'Éliminations Total', Valeur: data.totalStats.totalEliminations },
    { Métrique: 'Rebuys Total', Valeur: data.totalStats.totalRebuys },
    { Métrique: 'Gains Total (€)', Valeur: data.totalStats.totalPrizes },
  ];

  // Tournaments section
  const tournamentsData = data.tournaments.map(t => ({
    Tournoi: t.tournamentName,
    Date: new Date(t.date).toLocaleDateString('fr-FR'),
    Classement: t.finalRank || 'N/A',
    Points: t.totalPoints,
    Éliminations: t.eliminations,
    Rebuys: t.rebuys,
    'Gains (€)': t.prizeAmount || 0,
  }));

  let csvContent = 'STATISTIQUES JOUEUR\n';
  csvContent += convertToCSV(summaryData);
  csvContent += '\n\n';

  csvContent += 'HISTORIQUE DES TOURNOIS\n';
  csvContent += convertToCSV(tournamentsData);

  const filename = `stats_${data.player.nickname.toLowerCase()}_${new Date().toISOString().split('T')[0]}`;
  downloadCSV(csvContent, filename);
};
