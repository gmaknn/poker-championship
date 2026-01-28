import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

type Params = Promise<{ filename: string }>;

/**
 * GET /api/avatars/[filename]
 * Serve avatar images from the persistent /data/avatars directory
 * This route is used in production to serve avatars stored outside of /public
 */
export async function GET(
  request: NextRequest,
  segmentData: { params: Params }
) {
  try {
    const params = await segmentData.params;
    const filename = params.filename;

    // Validate filename to prevent directory traversal
    if (!filename || filename.includes('..') || filename.includes('/')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    // Only allow image extensions
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
    if (!allowedExtensions.includes(ext)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    // Build file path
    const avatarsDir = process.env.NODE_ENV === 'production'
      ? '/data/avatars'
      : join(process.cwd(), 'public', 'avatars');
    const filepath = join(avatarsDir, filename);

    // Check if file exists
    if (!existsSync(filepath)) {
      return NextResponse.json({ error: 'Avatar not found' }, { status: 404 });
    }

    // Read file
    const fileBuffer = await readFile(filepath);

    // Determine content type
    const contentType = ext === '.png' ? 'image/png'
      : ext === '.webp' ? 'image/webp'
      : 'image/jpeg';

    // Return image with caching headers
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
      },
    });
  } catch (error) {
    console.error('Error serving avatar:', error);
    return NextResponse.json(
      { error: 'Failed to serve avatar' },
      { status: 500 }
    );
  }
}
