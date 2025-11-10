import { toPng, toJpeg } from 'html-to-image';
import jsPDF from 'jspdf';

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
 * Optimized for WhatsApp sharing (high quality, proper sizing)
 */
export const exportToPNG = async ({
  element,
  filename,
  backgroundColor = '#ffffff',
  pixelRatio = 2,
}: ExportImageOptions): Promise<void> => {
  try {
    const dataUrl = await toPng(element, {
      backgroundColor,
      pixelRatio,
      cacheBust: true,
      style: {
        // Ensure good rendering
        transform: 'scale(1)',
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
 * Export tournament results with all formats
 * Provides multiple export options for sharing
 */
export const exportTournamentResults = async (
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
