import html2canvas from 'html2canvas';

/**
 * Captures the podium screen and downloads it as an image
 */
export async function capturePodiumPhoto(
  elementId: string = 'podium-content',
  filename?: string
): Promise<void> {
  try {
    const element = document.getElementById(elementId);

    if (!element) {
      console.error(`Element with id "${elementId}" not found`);
      return;
    }

    // Generate canvas from the element
    const canvas = await html2canvas(element, {
      backgroundColor: '#1a1f2e', // Match the dark background
      scale: 2, // Higher quality (2x resolution)
      logging: false,
      useCORS: true,
      allowTaint: true,
      imageTimeout: 0,
    });

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (!blob) {
        console.error('Failed to generate image blob');
        return;
      }

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = filename || `podium_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = url;
      link.click();

      // Clean up
      URL.revokeObjectURL(url);
    }, 'image/png');

  } catch (error) {
    console.error('Error capturing podium photo:', error);
  }
}

/**
 * Captures and returns the podium as a data URL (for sharing)
 */
export async function capturePodiumAsDataURL(
  elementId: string = 'podium-content'
): Promise<string | null> {
  try {
    const element = document.getElementById(elementId);

    if (!element) {
      console.error(`Element with id "${elementId}" not found`);
      return null;
    }

    const canvas = await html2canvas(element, {
      backgroundColor: '#1a1f2e',
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true,
      imageTimeout: 0,
    });

    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error capturing podium as data URL:', error);
    return null;
  }
}

/**
 * Shares the podium photo using the Web Share API (if supported)
 */
export async function sharePodiumPhoto(
  elementId: string = 'podium-content',
  tournamentName: string = 'Tournoi'
): Promise<void> {
  try {
    // Check if Web Share API is supported
    if (!navigator.share) {
      // Fallback to download
      await capturePodiumPhoto(elementId);
      return;
    }

    const element = document.getElementById(elementId);

    if (!element) {
      console.error(`Element with id "${elementId}" not found`);
      return;
    }

    const canvas = await html2canvas(element, {
      backgroundColor: '#1a1f2e',
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true,
      imageTimeout: 0,
    });

    // Convert canvas to blob
    canvas.toBlob(async (blob) => {
      if (!blob) {
        console.error('Failed to generate image blob');
        return;
      }

      const file = new File([blob], `podium_${tournamentName}.png`, { type: 'image/png' });

      try {
        await navigator.share({
          title: `Podium - ${tournamentName}`,
          text: `Résultats du tournoi ${tournamentName}`,
          files: [file],
        });
      } catch (shareError) {
        // User cancelled or share failed, fallback to download
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `podium_${tournamentName}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }
    }, 'image/png');

  } catch (error) {
    console.error('Error sharing podium photo:', error);
  }
}
