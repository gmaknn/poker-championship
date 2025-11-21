import jsPDF from 'jspdf';

/**
 * Season report data structure
 */
export interface SeasonReportData {
  season: {
    name: string;
    year: number;
    startDate: string;
    endDate: string;
  };
  overview: {
    totalTournaments: number;
    finishedTournaments: number;
    totalPlayers: number;
    totalEntries: number;
    avgPlayersPerTournament: number;
    totalPrizePool: number;
  };
  leaderboard: Array<{
    rank: number;
    player: {
      firstName: string;
      lastName: string;
      nickname: string;
    };
    totalPoints: number;
    tournamentsPlayed: number;
    victories: number;
    podiums: number;
    totalEliminations: number;
  }>;
  tournaments: Array<{
    name: string;
    date: string;
    playerCount: number;
    winner: string;
    prizePool: number;
  }>;
}

/**
 * Generate comprehensive season report PDF
 */
export const generateSeasonReportPDF = (data: SeasonReportData): void => {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  let y = margin;

  // Helper function to check if we need a new page
  const checkPageBreak = (neededSpace: number): void => {
    if (y + neededSpace > pageHeight - margin) {
      pdf.addPage();
      y = margin;
      addPageNumber();
    }
  };

  // Add page number
  const addPageNumber = (): void => {
    const pageNum = pdf.getCurrentPageInfo().pageNumber;
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    pdf.text(
      `Page ${pageNum}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    pdf.setTextColor(0, 0, 0);
  };

  // ================ COVER PAGE ================
  pdf.setFontSize(28);
  pdf.setFont('helvetica', 'bold');
  pdf.text('RAPPORT DE SAISON', pageWidth / 2, y + 40, { align: 'center' });

  y += 60;
  pdf.setFontSize(20);
  pdf.text(`${data.season.name} ${data.season.year}`, pageWidth / 2, y, { align: 'center' });

  y += 20;
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  const startDate = new Date(data.season.startDate).toLocaleDateString('fr-FR');
  const endDate = new Date(data.season.endDate).toLocaleDateString('fr-FR');
  pdf.text(`Du ${startDate} au ${endDate}`, pageWidth / 2, y, { align: 'center' });

  // Add decorative line
  y += 20;
  pdf.setLineWidth(0.5);
  pdf.line(pageWidth / 2 - 40, y, pageWidth / 2 + 40, y);

  // Summary box
  y += 30;
  pdf.setFontSize(10);
  const summaryData = [
    `Tournois organisés: ${data.overview.finishedTournaments} / ${data.overview.totalTournaments}`,
    `Total inscriptions: ${data.overview.totalEntries}`,
    `Moyenne joueurs/tournoi: ${data.overview.avgPlayersPerTournament}`,
    `Prize pool total: ${data.overview.totalPrizePool.toLocaleString('fr-FR')} €`,
  ];

  summaryData.forEach(line => {
    pdf.text(line, pageWidth / 2, y, { align: 'center' });
    y += 7;
  });

  // Footer
  y = pageHeight - 30;
  pdf.setFontSize(8);
  pdf.setTextColor(128, 128, 128);
  pdf.text('Généré par Poker Championship Manager', pageWidth / 2, y, { align: 'center' });
  pdf.text(new Date().toLocaleDateString('fr-FR'), pageWidth / 2, y + 5, { align: 'center' });
  pdf.setTextColor(0, 0, 0);

  addPageNumber();

  // ================ PAGE 2: CLASSEMENT ================
  pdf.addPage();
  y = margin;

  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('CLASSEMENT FINAL', margin, y);
  y += 15;

  // Table header
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setFillColor(52, 73, 94);
  pdf.setTextColor(255, 255, 255);
  pdf.rect(margin, y, contentWidth, 8, 'F');

  const colWidths = {
    rank: 15,
    name: 60,
    points: 25,
    tournaments: 25,
    victories: 20,
    podiums: 20,
  };

  pdf.text('#', margin + 2, y + 5.5);
  pdf.text('Joueur', margin + colWidths.rank + 2, y + 5.5);
  pdf.text('Points', margin + colWidths.rank + colWidths.name + 2, y + 5.5);
  pdf.text('Tournois', margin + colWidths.rank + colWidths.name + colWidths.points + 2, y + 5.5);
  pdf.text('Vict.', margin + colWidths.rank + colWidths.name + colWidths.points + colWidths.tournaments + 2, y + 5.5);
  pdf.text('Pod.', margin + colWidths.rank + colWidths.name + colWidths.points + colWidths.tournaments + colWidths.victories + 2, y + 5.5);

  y += 8;

  // Table rows
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);

  data.leaderboard.forEach((entry, index) => {
    checkPageBreak(10);

    // Alternate row colors
    if (index % 2 === 0) {
      pdf.setFillColor(245, 247, 250);
      pdf.rect(margin, y, contentWidth, 7, 'F');
    }

    // Highlight podium
    if (entry.rank === 1) {
      pdf.setFillColor(255, 215, 0, 0.3);
      pdf.rect(margin, y, contentWidth, 7, 'F');
      pdf.setFont('helvetica', 'bold');
    } else if (entry.rank <= 3) {
      pdf.setFillColor(192, 192, 192, 0.3);
      pdf.rect(margin, y, contentWidth, 7, 'F');
      pdf.setFont('helvetica', 'bold');
    } else {
      pdf.setFont('helvetica', 'normal');
    }

    pdf.text(entry.rank.toString(), margin + 2, y + 5);
    pdf.text(`${entry.player.firstName} ${entry.player.lastName}`, margin + colWidths.rank + 2, y + 5);
    pdf.text(entry.totalPoints.toString(), margin + colWidths.rank + colWidths.name + 2, y + 5);
    pdf.text(entry.tournamentsPlayed.toString(), margin + colWidths.rank + colWidths.name + colWidths.points + 2, y + 5);
    pdf.text(entry.victories.toString(), margin + colWidths.rank + colWidths.name + colWidths.points + colWidths.tournaments + 2, y + 5);
    pdf.text(entry.podiums.toString(), margin + colWidths.rank + colWidths.name + colWidths.points + colWidths.tournaments + colWidths.victories + 2, y + 5);

    y += 7;
  });

  addPageNumber();

  // ================ PAGE 3: TOURNOIS ================
  pdf.addPage();
  y = margin;

  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('HISTORIQUE DES TOURNOIS', margin, y);
  y += 15;

  // Tournament table header
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setFillColor(52, 73, 94);
  pdf.setTextColor(255, 255, 255);
  pdf.rect(margin, y, contentWidth, 8, 'F');

  const tournamentColWidths = {
    date: 25,
    name: 70,
    players: 25,
    winner: 50,
  };

  pdf.text('Date', margin + 2, y + 5.5);
  pdf.text('Tournoi', margin + tournamentColWidths.date + 2, y + 5.5);
  pdf.text('Joueurs', margin + tournamentColWidths.date + tournamentColWidths.name + 2, y + 5.5);
  pdf.text('Vainqueur', margin + tournamentColWidths.date + tournamentColWidths.name + tournamentColWidths.players + 2, y + 5.5);

  y += 8;

  // Tournament rows
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);

  data.tournaments.forEach((tournament, index) => {
    checkPageBreak(10);

    if (index % 2 === 0) {
      pdf.setFillColor(245, 247, 250);
      pdf.rect(margin, y, contentWidth, 7, 'F');
    }

    const date = new Date(tournament.date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
    });

    pdf.text(date, margin + 2, y + 5);

    // Truncate tournament name if too long
    const maxNameLength = 35;
    const tournamentName = tournament.name.length > maxNameLength
      ? tournament.name.substring(0, maxNameLength - 3) + '...'
      : tournament.name;
    pdf.text(tournamentName, margin + tournamentColWidths.date + 2, y + 5);

    pdf.text(tournament.playerCount.toString(), margin + tournamentColWidths.date + tournamentColWidths.name + 2, y + 5);
    pdf.text(tournament.winner, margin + tournamentColWidths.date + tournamentColWidths.name + tournamentColWidths.players + 2, y + 5);

    y += 7;
  });

  addPageNumber();

  // Save the PDF
  const filename = `rapport_${data.season.name.toLowerCase().replace(/\s+/g, '_')}_${data.season.year}.pdf`;
  pdf.save(filename);
};
