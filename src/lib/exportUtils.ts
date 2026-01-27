import { toPng, toJpeg } from 'html-to-image';
import jsPDF from 'jspdf';
import { preloadImagesAsBase64 } from './preload-images';

/**
 * Export options for image generation
 */
export interface ExportImageOptions {
  /** Element to capture */
  element: HTMLElement;
  /** Filename without extension */
  filename: string;
  /** Image format */
  format?: 'png' | 'jpeg';
  /** Image quality (0-1, for JPEG) */
  quality?: number;
  /** Background color (default: white) */
  backgroundColor?: string;
  /** Pixel ratio for high-res export (default: 2) */
  pixelRatio?: number;
}

/**
 * Export options for PDF generation
 */
export interface ExportPDFOptions {
  /** Element to capture */
  element: HTMLElement;
  /** Filename without extension */
  filename: string;
  /** PDF orientation */
  orientation?: 'portrait' | 'landscape';
  /** Page format */
  format?: 'a4' | 'letter';
}

/**
 * Downloads a blob as a file
 */
const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Downloads a data URL as a file
 */
const downloadDataUrl = (dataUrl: string, filename: string) => {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export element as PNG image
 * Captures the full content including scrolled areas
 */
export const exportToPNG = async ({
  element,
  filename,
  backgroundColor = '#ffffff',
  pixelRatio = 2,
}: ExportImageOptions): Promise<void> => {
  try {
    // Pré-charger les images externes en base64 pour éviter les problèmes CORS
    await preloadImagesAsBase64(element);

    // Get the full scrollable dimensions
    const scrollHeight = element.scrollHeight;
    const scrollWidth = element.scrollWidth;

    const dataUrl = await toPng(element, {
      backgroundColor,
      pixelRatio,
      cacheBust: true,
      // Capture full content dimensions
      width: scrollWidth,
      height: scrollHeight,
      style: {
        // Ensure full content is rendered
        transform: 'scale(1)',
        transformOrigin: 'top left',
        // Override any overflow hidden
        overflow: 'visible',
      },
      // Filter out elements with 'no-export' class
      filter: (node) => {
        if (node instanceof Element) {
          return !node.classList.contains('no-export');
        }
        return true;
      },
    });

    downloadDataUrl(dataUrl, `${filename}.png`);
  } catch (error) {
    console.error('Error exporting to PNG:', error);
    throw new Error('Failed to export image');
  }
};

/**
 * Export element as JPEG image
 * Smaller file size, good for WhatsApp
 */
export const exportToJPEG = async ({
  element,
  filename,
  quality = 0.95,
  backgroundColor = '#ffffff',
  pixelRatio = 2,
}: ExportImageOptions): Promise<void> => {
  try {
    // Pré-charger les images externes en base64 pour éviter les problèmes CORS
    await preloadImagesAsBase64(element);

    const dataUrl = await toJpeg(element, {
      backgroundColor,
      quality,
      pixelRatio,
      cacheBust: true,
      style: {
        transform: 'scale(1)',
      },
    });

    downloadDataUrl(dataUrl, `${filename}.jpg`);
  } catch (error) {
    console.error('Error exporting to JPEG:', error);
    throw new Error('Failed to export image');
  }
};

/**
 * Export element as WhatsApp-optimized image
 * Creates a square format (1:1) or portrait (9:16) optimized for sharing
 */
export const exportToWhatsApp = async ({
  element,
  filename,
  format = 'jpeg',
  quality = 0.92,
}: ExportImageOptions): Promise<void> => {
  try {
    // Higher pixel ratio for WhatsApp quality
    const pixelRatio = 2.5;
    const backgroundColor = '#ffffff';

    if (format === 'jpeg') {
      await exportToJPEG({
        element,
        filename: `${filename}_whatsapp`,
        quality,
        backgroundColor,
        pixelRatio,
      });
    } else {
      await exportToPNG({
        element,
        filename: `${filename}_whatsapp`,
        backgroundColor,
        pixelRatio,
      });
    }
  } catch (error) {
    console.error('Error exporting for WhatsApp:', error);
    throw new Error('Failed to export WhatsApp image');
  }
};

/**
 * Export element as PDF
 */
export const exportToPDF = async ({
  element,
  filename,
  orientation = 'portrait',
  format = 'a4',
}: ExportPDFOptions): Promise<void> => {
  try {
    // Pré-charger les images externes en base64 pour éviter les problèmes CORS
    await preloadImagesAsBase64(element);

    // First convert to image
    const dataUrl = await toPng(element, {
      backgroundColor: '#ffffff',
      pixelRatio: 2,
      cacheBust: true,
    });

    // Create PDF
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format,
    });

    // Get dimensions
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Add image to PDF (fit to page)
    const img = new Image();
    img.src = dataUrl;

    await new Promise((resolve, reject) => {
      img.onload = () => {
        const imgWidth = img.width;
        const imgHeight = img.height;
        const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);

        const width = imgWidth * ratio;
        const height = imgHeight * ratio;

        // Center the image
        const x = (pageWidth - width) / 2;
        const y = (pageHeight - height) / 2;

        pdf.addImage(dataUrl, 'PNG', x, y, width, height);
        pdf.save(`${filename}.pdf`);
        resolve(true);
      };

      img.onerror = reject;
    });
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw new Error('Failed to export PDF');
  }
};

/**
 * Tournament results data for text export
 */
export interface TournamentResultsData {
  tournamentName: string;
  date: Date;
  season?: {
    name: string;
    year: number;
  };
  players: Array<{
    finalRank: number | null;
    player: {
      nickname: string;
      firstName?: string;
      lastName?: string;
    };
    totalPoints: number;
    eliminationPoints: number;
    bonusPoints: number;
    penaltyPoints: number;
    prizeAmount?: number;
  }>;
  buyIn?: number;
  prizePool?: number;
}

/**
 * Export tournament results as formatted text for WhatsApp
 * Creates a nicely formatted text that can be copy-pasted
 */
export const exportToWhatsAppText = (data: TournamentResultsData): void => {
  const { tournamentName, date, season, players, buyIn, prizePool } = data;

  // Sort players by rank
  const rankedPlayers = players
    .filter((p) => p.finalRank !== null)
    .sort((a, b) => (a.finalRank || 0) - (b.finalRank || 0));

  // Build formatted text
  let text = `🎰 *${tournamentName}*\n`;
  text += `📅 ${new Date(date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}\n`;

  if (season) {
    text += `🏆 ${season.name} (${season.year})\n`;
  }

  text += '\n';

  if (buyIn && prizePool) {
    text += `💰 Buy-in: ${buyIn}€ | Prize Pool: ${prizePool}€\n`;
    text += `👥 Joueurs: ${rankedPlayers.length}\n\n`;
  }

  // Podium
  if (rankedPlayers.length >= 3) {
    text += '🏅 *PODIUM*\n';
    const medals = ['🥇', '🥈', '🥉'];
    for (let i = 0; i < Math.min(3, rankedPlayers.length); i++) {
      const p = rankedPlayers[i];
      text += `${medals[i]} *${p.player.nickname}* - ${p.totalPoints} pts`;
      if (p.prizeAmount) {
        text += ` (${p.prizeAmount}€)`;
      }
      text += '\n';
    }
    text += '\n';
  }

  // Full rankings
  text += '📊 *CLASSEMENT COMPLET*\n';
  rankedPlayers.forEach((p) => {
    const rank = p.finalRank || 0;
    text += `${rank}. ${p.player.nickname} - ${p.totalPoints} pts`;

    // Details
    const details = [];
    if (p.eliminationPoints > 0) details.push(`${p.eliminationPoints} élim`);
    if (p.bonusPoints > 0) details.push(`+${p.bonusPoints} bonus`);
    if (p.penaltyPoints < 0) details.push(`${p.penaltyPoints} pénalité`);

    if (details.length > 0) {
      text += ` (${details.join(', ')})`;
    }
    text += '\n';
  });

  text += '\n_Généré par Poker Championship Manager_';

  // Copy to clipboard
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text)
      .then(() => {
        alert('✅ Texte copié dans le presse-papiers!\nVous pouvez maintenant le coller dans WhatsApp.');
      })
      .catch((error) => {
        console.error('Error copying to clipboard:', error);
        // Fallback: open dialog with text
        showTextDialog(text);
      });
  } else {
    // Fallback for browsers without clipboard API
    showTextDialog(text);
  }
};

/**
 * Show text in a dialog for manual copy
 */
const showTextDialog = (text: string) => {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '50%';
  textarea.style.top = '50%';
  textarea.style.transform = 'translate(-50%, -50%)';
  textarea.style.width = '80%';
  textarea.style.height = '80%';
  textarea.style.padding = '20px';
  textarea.style.fontSize = '14px';
  textarea.style.fontFamily = 'monospace';
  textarea.style.border = '2px solid #333';
  textarea.style.borderRadius = '8px';
  textarea.style.zIndex = '9999';
  textarea.style.backgroundColor = '#fff';

  document.body.appendChild(textarea);
  textarea.select();

  // Add close button
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕ Fermer';
  closeBtn.style.position = 'fixed';
  closeBtn.style.top = 'calc(50% - 40% - 30px)';
  closeBtn.style.right = 'calc(50% - 40%)';
  closeBtn.style.padding = '8px 16px';
  closeBtn.style.backgroundColor = '#333';
  closeBtn.style.color = '#fff';
  closeBtn.style.border = 'none';
  closeBtn.style.borderRadius = '4px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.zIndex = '10000';

  closeBtn.onclick = () => {
    document.body.removeChild(textarea);
    document.body.removeChild(closeBtn);
  };

  document.body.appendChild(closeBtn);

  alert('📋 Sélectionnez le texte et copiez-le (Ctrl+C ou Cmd+C)');
};

/**
 * Blind structure data for text export
 */
export interface BlindStructureData {
  tournamentName: string;
  date?: Date;
  startingChips: number;
  levels: Array<{
    level: number;
    smallBlind: number;
    bigBlind: number;
    ante: number;
    duration: number;
  }>;
  totalDuration?: number;
}

/**
 * Export blind structure as formatted text for WhatsApp
 * Creates a nicely formatted text that can be copy-pasted
 */
export const exportBlindStructureText = (data: BlindStructureData): void => {
  const { tournamentName, date, startingChips, levels, totalDuration } = data;

  let text = `🎰 *${tournamentName}*\n`;
  text += `📊 *STRUCTURE DES BLINDES*\n\n`;

  if (date) {
    text += `📅 ${new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}\n`;
  }

  text += `💰 Stack de départ: ${startingChips.toLocaleString('fr-FR')} jetons\n`;

  if (totalDuration) {
    const hours = Math.floor(totalDuration / 60);
    const minutes = totalDuration % 60;
    text += `⏱️ Durée totale: ${hours}h${minutes.toString().padStart(2, '0')}\n`;
  }

  text += `\n`;

  // Levels table
  text += `*Niveau | SB/BB | Ante | Durée*\n`;
  text += `${'─'.repeat(40)}\n`;

  levels.forEach((level) => {
    const hasAnte = level.ante > 0;
    const anteStr = hasAnte ? ` | ${level.ante}` : ' | -';

    text += `${level.level.toString().padStart(2, ' ')}. | `;
    text += `${level.smallBlind.toLocaleString('fr-FR')}/${level.bigBlind.toLocaleString('fr-FR')}`;
    text += anteStr;
    text += ` | ${level.duration}min\n`;

    // Add break indicator after every 4 levels (common practice)
    if (level.level % 4 === 0 && level.level < levels.length) {
      text += `    ☕ *PAUSE*\n`;
    }
  });

  text += '\n_Généré par Poker Championship Manager_';

  // Copy to clipboard
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text)
      .then(() => {
        alert('✅ Structure de blindes copiée!\nVous pouvez maintenant la coller dans WhatsApp.');
      })
      .catch((error) => {
        console.error('Error copying to clipboard:', error);
        showTextDialog(text);
      });
  } else {
    showTextDialog(text);
  }
};

/**
 * Season leaderboard data for text export
 */
export interface SeasonLeaderboardData {
  seasonName: string;
  year: number;
  players: Array<{
    rank: number;
    player: {
      nickname: string;
      firstName?: string;
      lastName?: string;
    };
    totalPoints: number;
    tournamentsPlayed: number;
    firstPlaces: number;
    secondPlaces: number;
    thirdPlaces: number;
  }>;
  totalTournaments: number;
}

/**
 * Export season leaderboard as formatted text for WhatsApp
 * Creates a nicely formatted text that can be copy-pasted
 */
export const exportSeasonLeaderboardText = (data: SeasonLeaderboardData): void => {
  const { seasonName, year, players, totalTournaments } = data;

  let text = `🏆 *CLASSEMENT ${seasonName.toUpperCase()}*\n`;
  text += `📅 Année ${year}\n`;
  text += `🎰 ${totalTournaments} tournoi${totalTournaments > 1 ? 's' : ''} joué${totalTournaments > 1 ? 's' : ''}\n\n`;

  // Podium
  if (players.length >= 3) {
    text += '🏅 *PODIUM*\n';
    const medals = ['🥇', '🥈', '🥉'];
    for (let i = 0; i < Math.min(3, players.length); i++) {
      const p = players[i];
      text += `${medals[i]} *${p.player.nickname}* - ${p.totalPoints} pts`;
      text += ` (${p.tournamentsPlayed} tournois)\n`;
    }
    text += '\n';
  }

  // Full leaderboard
  text += '📊 *CLASSEMENT COMPLET*\n';
  text += `*Rang | Joueur | Points | Tournois*\n`;
  text += `${'─'.repeat(40)}\n`;

  players.forEach((p) => {
    text += `${p.rank.toString().padStart(2, ' ')}. ${p.player.nickname.padEnd(15, ' ')} `;
    text += `${p.totalPoints.toString().padStart(5, ' ')} pts `;
    text += `(${p.tournamentsPlayed})\n`;

    // Add stats for top 10
    if (p.rank <= 10 && (p.firstPlaces > 0 || p.secondPlaces > 0 || p.thirdPlaces > 0)) {
      const stats = [];
      if (p.firstPlaces > 0) stats.push(`${p.firstPlaces}🥇`);
      if (p.secondPlaces > 0) stats.push(`${p.secondPlaces}🥈`);
      if (p.thirdPlaces > 0) stats.push(`${p.thirdPlaces}🥉`);
      if (stats.length > 0) {
        text += `     ${stats.join(' ')}\n`;
      }
    }
  });

  text += '\n_Généré par Poker Championship Manager_';

  // Copy to clipboard
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text)
      .then(() => {
        alert('✅ Classement copié!\nVous pouvez maintenant le coller dans WhatsApp.');
      })
      .catch((error) => {
        console.error('Error copying to clipboard:', error);
        showTextDialog(text);
      });
  } else {
    showTextDialog(text);
  }
};

/**
 * Export tournament results with all formats
 * Provides multiple export options for sharing
 */
export const exportTournamentResults = (
  element: HTMLElement,
  tournamentName: string
) => {
  const cleanName = tournamentName
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase();
  const filename = `tournoi_${cleanName}_${new Date().getTime()}`;

  return {
    png: () => exportToPNG({ element, filename }),
    jpeg: () => exportToJPEG({ element, filename }),
    whatsapp: () => exportToWhatsApp({ element, filename }),
    pdf: () => exportToPDF({ element, filename }),
  };
};
